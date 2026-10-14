import { Injectable, Logger } from '@nestjs/common';
import { ConnectorRunEntity } from '../entities/connector-run.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import { ViewConnectorSpecificationModel } from 'src/metadata/connector-specifications/dtos/view-connector-specification.model';
import { ServerTypeEnum, ExportFileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { ConnectorRunService } from './connector-run.service';
import { ObservationsExportService } from 'src/observation/services/observations-export.service';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { FileMetadataVo } from '../entities/connector-run.entity';
import { ConnectorRunFileService, RunFileUpsert } from './connector-run-file.service';
import { ConnectorRunSpecService, RunSpecInsert } from './connector-run-spec.service';
import { RunFileStatusEnum } from '../entities/connector-run-file.entity';

interface ExportFileOutcome {
    file: FileMetadataVo;
    uploaded: boolean;
    error?: string;
    /**
     * Time spent uploading this one file, recorded for a failed upload too — a
     * slow failure is itself the signal. Null until the upload is attempted,
     * which never happens when generation failed.
     */
    uploadMs: number | null;
}

/** Working state for one export binding's run — operationId is never persisted. */
interface ExportWorkItem {
    /** `connector_specification_bindings.id` — what the run tiers key on. */
    bindingId: number;
    /**
     * The binding's position in the connector, stored on the spec row so the
     * run's drill-down opens in the order the sysadmin arranged. Taken from the
     * index of `parameters.specifications`, which the API reads back ordered by
     * `sort_order` — the array's own order IS the stored order.
     */
    sortOrder: number;
    /** The binding was switched off; nothing was generated or uploaded for it. */
    disabled: boolean;
    specificationId: number;
    stationId: string | null;
    operationId: string | null;
    generateError?: string;
    outcomes: ExportFileOutcome[];
    /** Time spent generating this spec's files — stored as the spec's scanMs. */
    generateMs: number;
    /** Time spent uploading them — stored as the spec's transferMs. */
    uploadMs: number;
    /**
     * Observations read out of Postgres to build this spec's files — stored as
     * the spec's observationRows. Counted once per specification, because the
     * COPY that produces it runs once per specification however many files the
     * generation step then writes.
     */
    observationRows: number;
}

@Injectable()
export class ConnectorExportProcessorService {
    private readonly logger = new Logger(ConnectorExportProcessorService.name);

    constructor(
        private fileIOService: FileIOService,
        private connectorService: ConnectorSpecificationsService,
        private connectorRunService: ConnectorRunService,
        private runFileService: ConnectorRunFileService,
        private runSpecService: ConnectorRunSpecService,
        private observationsExportService: ObservationsExportService,
    ) { }

    /**
     * Run one export cycle on an already-queued run.
     *
     * Unlike an import there is no backlog and no resumption: an export
     * regenerates everything in its window each time, so a run that was
     * interrupted simply starts over.
     */
    public async processRun(run: ConnectorRunEntity): Promise<void> {
        const connector: ViewConnectorSpecificationModel = this.connectorService.find(run.connectorId);

        // Disabled between being queued and being dispatched. Stop before
        // querying Postgres and touching the server, and record it as cancelled
        // rather than finished — nothing was exported. Same guard as the import
        // side's processRun.
        if (connector.disabled) {
            this.logger.warn(`Connector ${connector.name} is disabled; cancelling queued run ${run.id} instead of generating exports`);
            await this.connectorRunService.cancel(run.id);
            return;
        }

        const exportBindings = connector.parameters.specifications;
        const enabledExportCount: number = exportBindings.filter(spec => !spec.disabled).length;
        this.logger.log(
            `Starting export run ${run.id} for connector: ${connector.name}. Specs to be processed: ${enabledExportCount}` +
            `${enabledExportCount === exportBindings.length ? '' : ` (${exportBindings.length - enabledExportCount} disabled)`}`,
        );
        await this.processExportSpecifications(connector, run);
        this.logger.log(`Finished export run ${run.id} for connector: ${connector.name}`);
    }

    /**
     * Process a single connector export specification
     */
    private async processExportSpecifications(connector: ViewConnectorSpecificationModel, run: ConnectorRunEntity) {
        const work: ExportWorkItem[] = [];

        let startTime: number;

        try {
            // Step 1. Generate export files
            startTime = Date.now();
            this.logger.log(`Generating exports for connector ${connector.name}`);
            await this.generateExportFilesForFileServer(connector, work);
            this.logger.log(`Completed generating exports for connector ${connector.name}. Time taken: ${Date.now() - startTime} milliseconds`);

            // Step 2. Upload generated files
            startTime = Date.now();
            this.logger.log(`Uploading exports for connector ${connector.name}`);
            switch (connector.serverType) {
                case ServerTypeEnum.FILE_SERVER:
                    await this.uploadToFileServer(connector, work);
                    break;
                case ServerTypeEnum.WEB_SERVER:
                    // TODO
                    break;
                default:
                    throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
            }
            this.logger.log(`Completed uploading exports for connector ${connector.name}. Time: ${Date.now() - startTime} milliseconds`);
        } finally {
            // Export operation directories are transient scratch space — a
            // failed one only holds a regenerable CSV (unlike a failed import,
            // whose remote source may have rotated away). Always tear them down.
            for (const item of work) {
                if (item.operationId) {
                    await this.fileIOService.deleteOperation(item.operationId);
                    item.operationId = null;
                }
            }
        }

        // Step 3. Record per-file outcomes + the per-spec rollup.
        //
        // Every generated file gets a row, success or failure, the same as an
        // import records every file it matched. Export rows carry no
        // de-duplication function — export names are timestamped and nothing is
        // ever compared against them — so this is a pure audit trail, and it is
        // kept bounded by run retention rather than by writing less: a run
        // generates a handful of files where an import discovers hundreds of
        // thousands, so the same retention sweep covers far more export runs.
        const records: RunFileUpsert[] = [];
        const specRecords: RunSpecInsert[] = [];

        for (const item of work) {
            let specSucceeded = 0;
            let specFailed = 0;

            if (item.generateError) {
                // A spec that generated nothing — one row carrying its error,
                // with an empty path (the UI renders it as "no file").
                specFailed++;
                records.push({
                    connectorId: connector.id,
                    bindingId: item.bindingId,
                    specificationId: item.specificationId,
                    stationId: item.stationId,
                    remotePath: '',
                    fileMtime: null,
                    fileSize: null,
                    lastStatus: RunFileStatusEnum.FAILED,
                    lastError: item.generateError,
                    connectorRunId: run.id,
                    operationId: null,
                    lastProcessMs: null,
                    lastTransferMs: null,
                });
            } else {
                for (const outcome of item.outcomes) {
                    if (outcome.uploaded) {
                        specSucceeded++;
                    } else {
                        specFailed++;
                    }
                    records.push({
                        connectorId: connector.id,
                        bindingId: item.bindingId,
                        specificationId: item.specificationId,
                        stationId: item.stationId,
                        remotePath: outcome.file.fileName,
                        fileMtime: outcome.file.modifiedDate ? new Date(outcome.file.modifiedDate) : null,
                        fileSize: outcome.file.size ?? null,
                        lastStatus: outcome.uploaded ? RunFileStatusEnum.SUCCESS : RunFileStatusEnum.FAILED,
                        lastError: outcome.uploaded ? null : (outcome.error ?? 'Upload failed'),
                        connectorRunId: run.id,
                        // Exports never retain: the operation directory holds
                        // only a regenerable CSV, and it is torn down above.
                        operationId: null,
                        // An upload is a TRANSFER, the mirror of an import's
                        // download, so it belongs to the same column — which is
                        // what lets "is it the network or our own work?" be
                        // asked of an export at all. It used to be recorded as
                        // processing, where it was indistinguishable from
                        // generation cost.
                        //
                        // Nothing is charged to processing: an export does no
                        // per-file local work. Generating IS its local work and
                        // is charged to the spec's scanMs, because it happens
                        // once for the spec rather than once per file.
                        lastProcessMs: null,
                        lastTransferMs: outcome.uploadMs,
                    });
                }
            }

            specRecords.push({
                connectorRunId: run.id,
                bindingId: item.bindingId,
                disabled: item.disabled,
                specificationId: item.specificationId,
                stationId: item.stationId,
                filePattern: null, // export specs have no pattern
                excludePatterns: [],
                sortOrder: item.sortOrder,
                excludedCount: 0,
                scannedCount: 0,   // nothing is scanned on the export side
                matchedCount: item.outcomes.length,
                succeededCount: specSucceeded,
                skippedCount: 0,
                failedCount: specFailed,
                emptyCount: 0, // an export generates its own files
                observationRows: item.observationRows,
                scanMs: item.generateMs,
                // An export does no per-file local work; its uploads are
                // transfers, and generating is charged to scanMs above.
                processMs: 0,
                transferMs: item.uploadMs,
            });
        }

        await this.runFileService.recordBatch(records);
        await this.runSpecService.recordBatch(specRecords);

        // The run's own counts and timings are not stored — they are summed
        // from the spec rows just written, whenever a run is read.
        await this.connectorRunService.update(run.id, {
            endedAt: new Date(),
            // An export has no snapshot of a remote directory to establish, but
            // this run did reach the server and do its work — which is what the
            // retention sweep uses the timestamp for, to tell a real run apart
            // from an attempt that never got anywhere.
            discoveredAt: new Date(),
        });
    }

    private async generateExportFilesForFileServer(connector: ViewConnectorSpecificationModel, work: ExportWorkItem[]): Promise<void> {
        const connectorParams = connector.parameters as ExportFileServerParametersDto;

        for (const [index, spec] of connectorParams.specifications.entries()) {
            const item: ExportWorkItem = {
                bindingId: spec.id ?? 0,
                sortOrder: index,
                disabled: spec.disabled ?? false,
                specificationId: spec.specificationId,
                stationId: spec.stationId,
                operationId: null,
                outcomes: [],
                generateMs: 0,
                uploadMs: 0,
                observationRows: 0,
            };
            work.push(item);

            // Switched off: nothing is generated and nothing is uploaded. The
            // work item is still pushed so the run records a zero-filled row for
            // it, the same as the import side — a disabled binding must be
            // visible in the run history rather than silently absent.
            if (item.disabled) {
                continue;
            }

            const generateStart = Date.now();

            try {
                const op: OperationContext = await this.fileIOService.createOperation();
                item.operationId = op.operationId;

                try {
                    this.logger.log(`Generating export file for specification ${spec.specificationId}`);
                    item.observationRows = await this.observationsExportService.generateExport(
                        spec.specificationId,
                        op,
                        {
                            stationIds: spec.stationId ? [spec.stationId] : undefined,
                            dateField: connectorParams.observationWindow.dateField,
                            last: connectorParams.observationWindow.durationMinutes,
                        });

                    const outputFiles = await fs.promises.readdir(op.outputDir);
                    for (const fileName of outputFiles) {
                        const fileStats = await fs.promises.stat(path.posix.join(op.outputDir, fileName));
                        item.outcomes.push({
                            file: { fileName, modifiedDate: fileStats.mtime.toISOString(), size: fileStats.size },
                            uploaded: false,
                            uploadMs: null,
                        });
                    }

                    this.logger.log(`Generated ${item.outcomes.length} export file(s) holding ${item.observationRows} observation(s) for specification ${spec.specificationId}`);

                } catch (error) {
                    const raw = error instanceof Error ? error.message : String(error);
                    item.generateError = `Failed to generate export file for specification ${spec.specificationId}: ${raw}`;
                    this.logger.error(item.generateError);
                }

            } catch (error) {
                item.generateError = `Failed to process specification ${spec.specificationId}: ${error instanceof Error ? error.message : String(error)}`;
                this.logger.error(item.generateError);
            }

            item.generateMs = Date.now() - generateStart;
        }
    }

    private async uploadToFileServer(connector: ViewConnectorSpecificationModel, work: ExportWorkItem[]): Promise<void> {
        const connectorParams = connector.parameters as ExportFileServerParametersDto;

        switch (connectorParams.protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                return this.uploadFileOverFtp(connector, work);
            case FileServerProtocolEnum.SFTP:
                return this.uploadFileOverSftp(connector, work);
            default:
                throw new Error(`Developer Error. Unsupported protocol: ${connectorParams.protocol}`);
        }
    }

    /**
     * Upload file via FTP
     */
    private async uploadFileOverFtp(connector: ViewConnectorSpecificationModel, work: ExportWorkItem[]): Promise<void> {
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();

        try {
            const connectorParams = connector.parameters as ExportFileServerParametersDto;

            await client.access({
                host: connector.hostName,
                port: connectorParams.port,
                user: connectorParams.username,
                password: await EncryptionUtils.decrypt(connectorParams.password), // Decrypt password
                secure: connectorParams.protocol === FileServerProtocolEnum.FTPS,
                secureOptions: connectorParams.protocol === FileServerProtocolEnum.FTPS
                    ? { rejectUnauthorized: false } // Allow self-signed certificates
                    : undefined,
            });
            this.logger.log(`Connected to FTP server ${connector.name}`);

            await client.cd(connectorParams.remotePath);

            for (const item of work) {
                if (!item.operationId) continue;
                const uploadStart = Date.now();
                const op = this.fileIOService.getOperationContext(item.operationId as crypto.UUID);
                for (const outcome of item.outcomes) {
                    const localFilePath = path.posix.join(op.outputDir, outcome.file.fileName);
                    const fileStart = Date.now();
                    try {
                        this.logger.log(`Uploading file ${outcome.file.fileName} to remote server`);
                        await client.uploadFrom(localFilePath, outcome.file.fileName);
                        outcome.uploaded = true;
                        this.logger.log(`Successfully uploaded file ${outcome.file.fileName}`);
                    } catch (error) {
                        outcome.error = `Failed to upload file ${outcome.file.fileName}: ${error instanceof Error ? error.message : String(error)}`;
                        this.logger.error(outcome.error);
                    }
                    outcome.uploadMs = Date.now() - fileStart;
                }
                item.uploadMs = Date.now() - uploadStart;
            }
        } finally {
            client.close();
        }
    }

    /**
     * Upload file via SFTP
     */
    private async uploadFileOverSftp(connector: ViewConnectorSpecificationModel, work: ExportWorkItem[]): Promise<void> {
        const client = new SftpClient();

        try {
            const connectorParams = connector.parameters as ExportFileServerParametersDto;

            await client.connect({
                host: connector.hostName,
                port: connectorParams.port,
                username: connectorParams.username,
                password: await EncryptionUtils.decrypt(connectorParams.password), // Decrypt password
                readyTimeout: connector.timeout ? connector.timeout * 1000 : undefined,
            });
            this.logger.log(`Connected to SFTP server ${connector.name}`);

            for (const item of work) {
                if (!item.operationId) continue;
                const uploadStart = Date.now();
                const op = this.fileIOService.getOperationContext(item.operationId as crypto.UUID);
                for (const outcome of item.outcomes) {
                    const localFilePathName = path.posix.join(op.outputDir, outcome.file.fileName);
                    const remoteFilePathName = path.posix.join(connectorParams.remotePath, outcome.file.fileName);
                    const fileStart = Date.now();
                    try {
                        this.logger.log(`Uploading file ${outcome.file.fileName} to remote server`);
                        await client.put(localFilePathName, remoteFilePathName);
                        outcome.uploaded = true;
                        this.logger.log(`Successfully uploaded file ${outcome.file.fileName}`);
                    } catch (error) {
                        outcome.error = `Failed to upload file ${outcome.file.fileName}: ${error instanceof Error ? error.message : String(error)}`;
                        this.logger.error(outcome.error);
                    }
                    outcome.uploadMs = Date.now() - fileStart;
                }
                item.uploadMs = Date.now() - uploadStart;
            }
        } finally {
            await client.end();
        }
    }
}

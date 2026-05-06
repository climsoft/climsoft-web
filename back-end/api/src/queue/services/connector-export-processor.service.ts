import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorJobPayloadDto, JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import { ViewConnectorSpecificationModel } from 'src/metadata/connector-specifications/dtos/view-connector-specification.model';
import { EndPointTypeEnum, ExportFileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { ConnectorExecutionLogService, CreateConnectorExecutionLogDto } from './connector-execution-log.service';
import { ObservationsExportService } from 'src/observation/services/observations-export.service';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { ExportFileServerExecutionActivityVo } from '../entity/connector-execution-log.entity';

@Injectable()
export class ConnectorExportProcessorService {
    private readonly logger = new Logger(ConnectorExportProcessorService.name);

    constructor(
        private fileIOService: FileIOService,
        private connectorService: ConnectorSpecificationsService,
        private connectorExecutionLogService: ConnectorExecutionLogService,
        private observationsExportService: ObservationsExportService,
    ) { }

    /**
     * Handle connector export jobs
     */
    @OnEvent('connector.export', { suppressErrors: false })
    public async handleExportJob(job: JobQueueEntity) {
        const payload = job.payload as ConnectorJobPayloadDto;

        this.logger.log(`Handling export job for connector ${payload.connectorId}`);

        try {
            const connector: ViewConnectorSpecificationModel = this.connectorService.find(payload.connectorId);
            this.logger.log(`Processing export job: ${job.id} for connector: ${connector.name}. Specs to be processed: ${connector.parameters.specifications.length}`);
            await this.processExportSpecifications(connector, job.entryUserId);
            this.logger.log(`Finished processing export job: ${job.id} for connector: ${connector.name}`);
        } catch (error) {
            this.logger.error(`Failed to process import job ${job.id}`, error);
            throw error; // Re-throw to mark job as failed
        }
    }

    /**
     * Process a single connector export specification
     */
    private async processExportSpecifications(connector: ViewConnectorSpecificationModel, userId: number) {
        // create new connector log
        const newConnectorLog: CreateConnectorExecutionLogDto = {
            connectorId: connector.id,
            executionStartDatetime: new Date(),
            executionEndDatetime: new Date(),
            totalErrors: 0,
            executionActivities: [],
            entryUserId: userId,
        };

        let startTime: number;

        // Step 1. Generate export files based on specifications
        startTime = new Date().getTime();
        this.logger.log(`Generating exports for connector ${connector.name}`);
        await this.generateExportFilesForFileServer(connector, newConnectorLog);
        this.logger.log(`Completed generating exports for connector ${connector.name}. Time taken: ${new Date().getTime() - startTime} milliseconds`);

        // Step 2. Upload generated files to remote server
        this.logger.log(`Generating exports for connector ${connector.name}`);
        startTime = new Date().getTime();
        switch (connector.endPointType) {
            case EndPointTypeEnum.FILE_SERVER:
                await this.uploadToFileServer(connector, newConnectorLog);
                break;
            case EndPointTypeEnum.WEB_SERVER:
                // TODO
                break;
            default:
                throw new Error(`Developer Error. Unsupported end point type: ${connector.endPointType}`);
        }
        this.logger.log(`Completed uploading exports for connector ${connector.name}. Time: ${new Date().getTime() - startTime} milliseconds`);

        // Step 3. Save the new the connector log
        newConnectorLog.executionEndDatetime = new Date();
        await this.connectorExecutionLogService.create(newConnectorLog);
    }

    private async generateExportFilesForFileServer(connector: ViewConnectorSpecificationModel, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        const connectorParams = connector.parameters as ExportFileServerParametersDto;

        for (const spec of connectorParams.specifications) {
            const newExecutionActivity: ExportFileServerExecutionActivityVo = {
                specificationId: spec.specificationId,
                stationId: spec.stationId, // TODO. Left here
                processedFiles: [],
            };

            try {
                // Create an operation for this export specification
                const op: OperationContext = await this.fileIOService.createOperation();
                newExecutionActivity.operationId = op.operationId;

                try {
                    this.logger.log(`Generating export file for specification ${spec.specificationId}`);
                    await this.observationsExportService.generateExport(spec.specificationId, op, { stationIds: spec.stationId ? [spec.stationId] : undefined, observationPeriod: { last: connectorParams.observationPeriod } });

                    // Scan the operation's output directory for generated files
                    const outputFiles = await fs.promises.readdir(op.outputDir);
                    for (const fileName of outputFiles) {
                        const filePath = path.posix.join(op.outputDir, fileName);
                        const fileStats = await fs.promises.stat(filePath);
                        newExecutionActivity.processedFiles.push({
                            fileName,
                            modifiedDate: fileStats.mtime.toISOString(),
                            size: fileStats.size,
                        });
                    }

                    this.logger.log(`Successfully generated export file for specification ${spec.specificationId}`);

                } catch (error) {
                    let errorMessage = error instanceof Error ? error.message : String(error);
                    errorMessage = `Failed to generate export file for specification ${spec.specificationId}: ${errorMessage}`;
                    newExecutionActivity.errorMessage = errorMessage;
                    newConnectorLog.totalErrors++;
                    this.logger.error(errorMessage);
                }

            } catch (error) {
                this.logger.error(`Failed to process specification ${spec.specificationId}`, error);
                newConnectorLog.totalErrors++;
            }

            newConnectorLog.executionActivities.push(newExecutionActivity);
        }
    }

    private async uploadToFileServer(connector: ViewConnectorSpecificationModel, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        const connectorParams = connector.parameters as ExportFileServerParametersDto;

        // Depending on protocol. Upload files
        switch (connectorParams.protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                await this.uploadFileOverFtp(connector, newConnectorLog);
                break;
            case FileServerProtocolEnum.SFTP:
                await this.uploadFileOverSftp(connector, newConnectorLog);
                break;
            default:
                throw new Error(`Developer Error. Unsupported protocol: ${connectorParams.protocol}`);
        }


    }

    /**
     * Upload file via FTP
     */
    private async uploadFileOverFtp(connector: ViewConnectorSpecificationModel, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();

        try {
            const connectorParams = connector.parameters as ExportFileServerParametersDto;

            // Step 1: Connect to FTP server
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

            // Step 2: Set the working directory
            await client.cd(connectorParams.remotePath);



            // Step 3: Upload files from each operation's output directory
            for (const exportExecutionActivity of (newConnectorLog.executionActivities as ExportFileServerExecutionActivityVo[])) {
                if (!exportExecutionActivity.processedFiles || !exportExecutionActivity.operationId) {
                    continue;
                }

                const op = this.fileIOService.getOperationContext(exportExecutionActivity.operationId as crypto.UUID);
                for (const file of exportExecutionActivity.processedFiles) {
                    const localFilePath = path.posix.join(op.outputDir, file.fileName);
                    const remoteFileName = file.fileName;
                    try {
                        this.logger.log(`Uploading file ${remoteFileName} to remote server`);
                        await client.uploadFrom(localFilePath, remoteFileName);
                        this.logger.log(`Successfully uploaded file ${remoteFileName}`);
                    } catch (error) {
                        let errorMessage = error instanceof Error ? error.message : String(error);
                        errorMessage = `Failed to upload file ${remoteFileName}: ${errorMessage}`;
                        exportExecutionActivity.errorMessage = exportExecutionActivity.errorMessage ? `${exportExecutionActivity.errorMessage}/n${errorMessage}` : errorMessage;
                        newConnectorLog.totalErrors++;
                        this.logger.error(errorMessage);
                    }
                }
            }

        } finally {
            client.close();
        }
    }

    /**
     * Upload file via SFTP
     */
    private async uploadFileOverSftp(connector: ViewConnectorSpecificationModel, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        const client = new SftpClient();

        try {
            const connectorParams = connector.parameters as ExportFileServerParametersDto;

            // Step 1: Connect to SFTP server
            await client.connect({
                host: connector.hostName,
                port: connectorParams.port,
                username: connectorParams.username,
                password: await EncryptionUtils.decrypt(connectorParams.password), // Decrypt password
                readyTimeout: connector.timeout ? connector.timeout * 1000 : undefined,
            });

            this.logger.log(`Connected to SFTP server ${connector.name}`);

            // Step 2: Upload files from each operation's output directory
            for (const exportExecutionActivity of (newConnectorLog.executionActivities as ExportFileServerExecutionActivityVo[])) {
                if (!exportExecutionActivity.processedFiles || !exportExecutionActivity.operationId) {
                    continue;
                }

                const op = this.fileIOService.getOperationContext(exportExecutionActivity.operationId as crypto.UUID);
                for (const file of exportExecutionActivity.processedFiles) {
                    const localFilePathName = path.posix.join(op.outputDir, file.fileName);
                    const remoteFileName = file.fileName;
                    const remoteFilePathName = path.posix.join(connectorParams.remotePath, remoteFileName);
                    try {
                        this.logger.log(`Uploading file ${remoteFileName} to remote server`);
                        await client.put(localFilePathName, remoteFilePathName);
                        this.logger.log(`Successfully uploaded file ${remoteFileName}`);
                    } catch (error) {
                        let errorMessage = error instanceof Error ? error.message : String(error);
                        errorMessage = `Failed to upload file ${remoteFileName}: ${errorMessage}`;
                        exportExecutionActivity.errorMessage = exportExecutionActivity.errorMessage ? `${exportExecutionActivity.errorMessage}/n${errorMessage}` : errorMessage;
                        newConnectorLog.totalErrors++;
                        this.logger.error(errorMessage);
                    }
                }
            }

        } finally {
            await client.end();
        }
    }
}

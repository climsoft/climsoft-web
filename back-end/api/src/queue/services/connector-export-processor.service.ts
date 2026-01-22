import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorJobPayloadDto, JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import * as path from 'path';
import { Client as FtpClient } from 'basic-ftp';
import * as SftpClient from 'ssh2-sftp-client';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { EndPointTypeEnum, ExportFileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ConnectorExecutionLogService, CreateConnectorExecutionLogDto } from './connector-execution-log.service';
import { ObservationsExportService } from 'src/observation/services/observations-export.service';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { ExportFileProcessingResultVo, ExportFileServerExecutionActivityVo, FileMetadataVo } from '../entity/connector-execution-log.entity';
import * as fs from 'fs';

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
    @OnEvent('connector.export')
    public async handleExportJob(job: JobQueueEntity) {
        const payload = job.payload as ConnectorJobPayloadDto;

        this.logger.log(`Processing export job for connector ${payload.connectorId}`);
        const connector: ViewConnectorSpecificationDto = await this.connectorService.find(payload.connectorId);
        try {
            await this.processExportSpecifications(connector, job.entryUserId);
        } catch (error) {
            this.logger.error(`Failed to process export job for connector ${connector.name}`, error);
            throw error; // Re-throw to mark job as failed
        }
    }

    /**
     * Process a single connector export specification
     */
    private async processExportSpecifications(connector: ViewConnectorSpecificationDto, userId: number) {
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
        this.logger.log(`Generating exports for connector ${connector.name}`);
        startTime = new Date().getTime();
        await this.generateExportFilesForFileServer(connector, newConnectorLog);
        this.logger.log(`Completed generating exports for connector ${connector.name}. Time: ${new Date().getTime() - startTime} milliseconds`);

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

    private async generateExportFilesForFileServer(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        const connectorParams = connector.parameters as ExportFileServerParametersDto;

        for (const spec of connectorParams.specifications) {
            const newExecutionActivity: ExportFileServerExecutionActivityVo = {
                filePattern: spec.filePattern,
                specificationId: spec.specificationId,
                processedFiles: [],
            };

            try {

                // Generate remote file name based on pattern
                const timestamp = this.formatTimestamp(new Date(), spec.filePattern);
                // TODO. Think about the implication of prefixing the file with 'export_' in regards to names that users may expect in the remote server
                const exportFilePathName = path.posix.join(this.fileIOService.apiExportsDir, `export_${connector.id}_${spec.specificationId}_${timestamp}.csv`);

                const fileProcessingResult: ExportFileProcessingResultVo = {};

                try {
                    // Generate export file
                    this.logger.log(`Generating export file for specification ${spec.specificationId}`);
                    await this.observationsExportService.generateExport(spec.specificationId, exportFilePathName, { observationPeriod: { last: (connector.parameters as ExportFileServerParametersDto).observationPeriod } });

                    // Get file stats for metadata
                    const fileStats = await fs.promises.stat(exportFilePathName);
                    fileProcessingResult.processedFileMetadata = {
                        fileName: path.basename(exportFilePathName),
                        modifiedDate: fileStats.mtime.toISOString(),
                        size: fileStats.size,
                    };
                    this.logger.log(`Generated export file ${path.basename(exportFilePathName)}`);
                } catch (error) {
                    let errorMessage = error instanceof Error ? error.message : String(error);
                    errorMessage = `Failed to generate export file for specification ${spec.specificationId}: ${errorMessage}`;
                    fileProcessingResult.errorMessage = errorMessage;
                    newConnectorLog.totalErrors++;
                    this.logger.error(errorMessage);
                }

                newExecutionActivity.processedFiles.push(fileProcessingResult);
            } catch (error) {
                this.logger.error(`Failed to process specification ${spec.specificationId}`, error);
                newConnectorLog.totalErrors++;
            }

            newConnectorLog.executionActivities.push(newExecutionActivity);
        }
    }

    /**
     * Format timestamp based on pattern
     */
    private formatTimestamp(date: Date, pattern: string): string {
        if (pattern === 'yyyymmddhhmmss') {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
        }
        return Date.now().toString();
    }

    private async uploadToFileServer(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
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
    private async uploadFileOverFtp(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
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

            // Step 3: Upload file
            for (const exportExecutionActivity of (newConnectorLog.executionActivities as ExportFileServerExecutionActivityVo[])) {
                for (const file of exportExecutionActivity.processedFiles) {

                    // If not generated due to errors then skip upload
                    if (!file.processedFileMetadata) {
                        continue;
                    }

                    const localFilePath = path.posix.join(this.fileIOService.apiExportsDir, file.processedFileMetadata.fileName);
                    const remoteFileName = file.processedFileMetadata.fileName;
                    try {
                        this.logger.log(`Uploading file ${remoteFileName} to remote server`);
                        await client.uploadFrom(localFilePath, remoteFileName);
                        this.logger.log(`Successfully uploaded file ${remoteFileName}`);

                    } catch (error) {
                        let errorMessage = error instanceof Error ? error.message : String(error);
                        errorMessage = `Failed to upload file ${remoteFileName}: ${errorMessage}`;
                        file.errorMessage = errorMessage;
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
    private async uploadFileOverSftp(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
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

            // Step 2: Upload file
            for (const exportExecutionActivity of (newConnectorLog.executionActivities as ExportFileServerExecutionActivityVo[])) {
                for (const file of exportExecutionActivity.processedFiles) {

                    // If not generated due to errors then skip upload
                    if (!file.processedFileMetadata) {
                        continue;
                    }

                    const localFilePath = path.posix.join(this.fileIOService.apiExportsDir, file.processedFileMetadata.fileName);
                    const remoteFileName = file.processedFileMetadata.fileName;
                    const remoteFilePath = path.posix.join(connectorParams.remotePath, remoteFileName);
                    try {
                        this.logger.log(`Uploading file ${remoteFileName} to remote server`);
                        await client.put(localFilePath, remoteFilePath);
                        this.logger.log(`Successfully uploaded file ${remoteFileName}`);
                    } catch (error) {
                        let errorMessage = error instanceof Error ? error.message : String(error);
                        errorMessage = `Failed to upload file ${remoteFileName}: ${errorMessage}`;
                        file.errorMessage = errorMessage;
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

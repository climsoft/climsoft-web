import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobPayloadDto, JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ObservationImportService } from 'src/observation/services/observations-import.service';
import * as path from 'path';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { EndPointTypeEnum, FileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ExecutionActivity, FileProcessingResultVo, FileServerExecutionActivityVo, RemoteFileMetadataVo } from '../entity/connector-execution-log.entity';
import { ConnectorExecutionLogService, CreateConnectorExecutionLogDto } from './connector-execution-log.service';
import { last } from 'rxjs';


@Injectable()
export class ConnectorImportProcessorService {
    private readonly logger: Logger = new Logger(ConnectorImportProcessorService.name);

    constructor(
        private fileIOService: FileIOService,
        private connectorService: ConnectorSpecificationsService,
        private connectorExecutionLogService: ConnectorExecutionLogService,
        private observationImportService: ObservationImportService,
    ) { }

    /**
     * Handle connector import jobs
     */
    @OnEvent('connector.import')
    public async handleImportJob(job: JobQueueEntity) {
        const payload: JobPayloadDto = job.payload;

        this.logger.log(`Processing import job for connector ${payload.payLoadId}`);

        const connector: ViewConnectorSpecificationDto = await this.connectorService.find(payload.payLoadId);

        try {
            await this.processImportSpecifications(connector, job.entryUserId);
        } catch (error) {
            this.logger.error(`Failed to process import job for connector ${payload.payLoadId}`, error);
            throw error; // Re-throw to mark job as failed
        }

    }

    /**
     * Process a single connector import specification
     */
    private async processImportSpecifications(connector: ViewConnectorSpecificationDto, userId: number) {

        // create new connector log
        const newConnectorLog: CreateConnectorExecutionLogDto = {
            connectorId: connector.id,
            executionStartDatetime: new Date(),
            executionEndDatetime: new Date(),
            totalErrors: 0,
            executionActivities: [],
            entryUserId: userId,
        };

        // Step 1. Download the files
        switch (connector.endPointType) {
            case EndPointTypeEnum.FILE_SERVER:
                await this.downloadFromFileServer(connector, newConnectorLog);
                break;
            case EndPointTypeEnum.WEB_SERVER:
                // TODO
                break;
            default:
                throw new Error(`Unsupported end point type: ${connector.endPointType}`);
        }

        // Step 2. Process downloaded files and save them as processed files
        for (const executionActivity of newConnectorLog.executionActivities) {
            for (const file of executionActivity.processedFiles) {

                // If not downloaded due to errors then skip processing
                if (!file.downloadedFileName) {
                    continue;
                }

                try {
                    file.processedFileName = path.join(this.fileIOService.apiImportsDir, `${path.parse(file.downloadedFileName).name}_processed.csv`);

                    this.logger.log(`Processing file ${path.basename(file.downloadedFileName)} into ${path.basename(file.processedFileName)}`);
                    await this.observationImportService.processFileForImport(
                        executionActivity.specificationId, file.downloadedFileName, file.processedFileName, userId, executionActivity.stationId,
                    );
                    this.logger.log(`Successfully processed file ${path.basename(file.downloadedFileName)} into ${path.basename(file.processedFileName)}`);
                } catch (error) {
                    let errorMessage = error instanceof Error ? error.message : String(error);
                    errorMessage = `Failed to process file ${path.basename(file.downloadedFileName)} for specification ${executionActivity.specificationId}: ${errorMessage}`;
                    file.errorMessage = errorMessage;
                    this.logger.error(errorMessage);

                }
            }
        }

        // Step 3. Import all processed files into database
        this.logger.log(`Starting bulk import for connector ${connector.id}`);
        for (const executionActivity of newConnectorLog.executionActivities) {
            const processedFileNames: string[] = [];

            // Get process file names
            for (const file of executionActivity.processedFiles) {
                if (file.processedFileName) {
                    processedFileNames.push(file.processedFileName);
                }
            }

            await this.observationImportService.importProcessedFilesToDatabase(processedFileNames);
        }
        this.logger.log(`Completed bulk import for connector ${connector.id}`);

        // Step 4. Save the new the connector log
        newConnectorLog.executionEndDatetime = new Date();
        await this.connectorExecutionLogService.create(newConnectorLog);
    }

    private async downloadFromFileServer(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        // Get last known file metadata for change detection 
        let lastKnownConnectorLog = await this.connectorExecutionLogService.findLatestByConnector(connector.id);
        let lastKnownConnectorExecutionActivities: FileServerExecutionActivityVo[] = lastKnownConnectorLog ? lastKnownConnectorLog.executionActivities : [];

        const connectorParams: FileServerParametersDto = connector.parameters as FileServerParametersDto;

        switch (connectorParams.protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                await this.downloadFileOverFtp(connector, newConnectorLog, lastKnownConnectorExecutionActivities);
                break;
            case FileServerProtocolEnum.SFTP:
                //this.downloadFileOverSftp(connector, newConnectorLog, lastKnownConnectorExecutionActivities);
                break;
            default:
                throw new Error(`Developer Error. Unsupported end point type: ${connector.endPointType}`);
        }
    }


    private async downloadFileOverFtp(connector: ViewConnectorSpecificationDto, newConnectorLog: CreateConnectorExecutionLogDto, lastKnownExecutionActivities: FileServerExecutionActivityVo[]): Promise<FileServerExecutionActivityVo[]> {
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();
        try {

            const connectorParams = connector.parameters as FileServerParametersDto;

            // Configure FTP client for better compatibility
            //client.ftp.verbose = true; // Enable verbose logging for debugging

            // Step 1: Connect to FTP server
            await client.access({
                host: connector.hostName,
                port: connector.parameters.port,
                user: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
                secure: connectorParams.protocol === FileServerProtocolEnum.FTPS,
                secureOptions: connectorParams.protocol === FileServerProtocolEnum.FTPS
                    ? { rejectUnauthorized: false } // Allow self-signed certificates
                    : undefined,
            });

            this.logger.log(`Connected to FTP server ${connector.name}`);

            // Set the working directory
            await client.cd(connectorParams.remotePath);

            // Step 2: Get the list of files in remote directory and set the corresponding source
            const fileList = await client.list();

            this.logger.log(`File lists for FTP server ${connector.name} successfully retrieved. Found: ${fileList.length}`);

            const executionActivities: FileServerExecutionActivityVo[] = [];

            for (const spec of connectorParams.specifications) {

                // Step 3: Find matching files
                const matchingFiles = fileList.filter(file =>
                    file.name.match(new RegExp(spec.filePattern.replace(/\*/g, '.*')))
                );

                if (matchingFiles.length === 0) {
                    this.logger.warn(`No files found matching pattern ${spec.filePattern} for connector ${connector.name}`);
                    continue;
                }

                const newExecutionActivity: FileServerExecutionActivityVo = {
                    filePattern: spec.filePattern,
                    specificationId: spec.specificationId,
                    stationId: spec.stationId,
                    processedFiles: [],
                };

                // Step 4: Check file changes and download only modified files
                this.logger.log(`Found ${matchingFiles.length} file(s) matching pattern ${spec.filePattern} for specification ${spec.specificationId}`);

                const lastKnownExecutionActivity: FileServerExecutionActivityVo | undefined = lastKnownExecutionActivities.find(item => item.specificationId === spec.specificationId);

                for (const remoteFile of matchingFiles) {
                    // Check if file has changed since last download
                    const fileModifiedDate = remoteFile.modifiedAt || new Date();
                    const fileSize = remoteFile.size || 0;
                    const fileProcessingResult: FileProcessingResultVo = { remoteFileMetadata: { fileName: remoteFile.name, modifiedDate: fileModifiedDate.toISOString(), size: fileSize } };

                    if (lastKnownExecutionActivity && !this.hasFileChanged(remoteFile.name, fileModifiedDate, fileSize, lastKnownExecutionActivity)) {
                        this.logger.log(`Skipping unchanged file: ${remoteFile.name} )`);
                        fileProcessingResult.skipped = true;
                    } else {
                        const localDownloadPath = path.join(this.fileIOService.apiImportsDir, `connector_${connector.id}_spec_${spec.specificationId}_download_${remoteFile.name}`);
                        try {
                            await client.downloadTo(localDownloadPath, remoteFile.name);
                            fileProcessingResult.downloadedFileName = localDownloadPath;
                            this.logger.log(`Downloaded file ${remoteFile.name} to ${localDownloadPath}  `);
                        } catch (error) {
                            let errorMessage = error instanceof Error ? error.message : String(error);
                            errorMessage = `Failed to download file ${remoteFile.name} for specification ${spec.specificationId}: ${errorMessage}`;
                            fileProcessingResult.errorMessage = errorMessage;
                            this.logger.error(errorMessage);
                        }
                    }

                    newExecutionActivity.processedFiles.push(fileProcessingResult);
                }

                executionActivities.push(newExecutionActivity);
            }

            return executionActivities;

        } finally {
            client.close();
        }
    }


    // TODO. Implement the sftp download in a similar way to the ftp download using the correct `SftpClient` functions
    // private async downloadFileOverSftp(connector: ViewConnectorSpecificationDto): Promise<{ imports: ConnectorImport[], metadata: FileMetadata[] }> {
    //     const client = new SftpClient();
    //     try {
    //         const connectorParams = connector.parameters as FileServerParametersDto;

    //         // Get last known file metadata for change detection
    //         const lastKnownMetadata = this.getLastKnownMetadata(connector);

    //         // Step 1: Connect to SFTP server
    //         await client.connect({
    //             host: connector.hostName,
    //             port: connector.parameters.port,
    //             username: connector.parameters.username,
    //             password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
    //             readyTimeout: connector.timeout * 1000,
    //         });

    //         this.logger.log(`Connected to SFTP server ${connector.name}`);

    //         // Step 2: Get the list of files in remote directory
    //         const fileList = await client.list(connectorParams.remotePath);

    //         this.logger.log(`File lists for SFTP server ${connector.name} successfully retrieved. Found: ${fileList.length}`);

    //         // Holds specification id, remote file name and local file name
    //         const connectorImports: ConnectorImport[] = [];
    //         const downloadedFilesMetadata: FileMetadata[] = [];

    //         for (const spec of connectorParams.specifications) {

    //             // Step 3: Find matching files
    //             const matchingFiles = fileList.filter((file: any) =>
    //                 file.name.match(new RegExp(spec.filePattern.replace(/\*/g, '.*')))
    //             );

    //             if (matchingFiles.length === 0) {
    //                 this.logger.warn(`No files found matching pattern ${spec.filePattern} for connector ${connector.name}`);
    //                 continue;
    //             }

    //             const connectorImport: ConnectorImport = {
    //                 specificationId: spec.specificationId,
    //                 stationId: spec.stationId,
    //                 files: []
    //             };

    //             // Step 4: Check file changes and download only modified files
    //             this.logger.log(`Found ${matchingFiles.length} file(s) matching pattern ${spec.filePattern} for specification ${spec.specificationId}`);
    //             let downloadedCount = 0;
    //             let skippedCount = 0;

    //             for (const remoteFile of matchingFiles) {
    //                 // Check if file has changed since last download
    //                 // SFTP file list returns modifyTime as milliseconds since epoch
    //                 const fileModifiedDate = new Date(remoteFile.modifyTime || Date.now());
    //                 const fileSize = remoteFile.size || 0;

    //                 if (!this.hasFileChanged(remoteFile.name, fileModifiedDate, fileSize, lastKnownMetadata)) {
    //                     this.logger.log(`Skipping unchanged file: ${remoteFile.name} (last modified: ${fileModifiedDate.toISOString()}, size: ${fileSize})`);
    //                     skippedCount++;
    //                     continue;
    //                 }

    //                 const remoteFilePath = path.posix.join(connectorParams.remotePath, remoteFile.name);
    //                 const localDownloadPath = path.join(this.fileIOService.apiImportsDir, `connector_${connector.id}_spec_${spec.specificationId}_download_${remoteFile.name}`);

    //                 try {
    //                     await client.get(remoteFilePath, localDownloadPath);
    //                     this.logger.log(`Downloaded file ${remoteFile.name} to ${localDownloadPath} (modified: ${fileModifiedDate.toISOString()}, size: ${fileSize})`);
    //                     connectorImport.files.push({ downloadedFile: localDownloadPath, processedFile: '' });
    //                     downloadedCount++;

    //                     // Store metadata for this downloaded file
    //                     downloadedFilesMetadata.push({
    //                         fileName: remoteFile.name,
    //                         modifiedDate: fileModifiedDate.toISOString(),
    //                         size: fileSize
    //                     });
    //                 } catch (error) {
    //                     const errorMessage = error instanceof Error ? error.message : String(error);
    //                     throw new Error(`Failed to download file ${remoteFile.name} for specification ${spec.specificationId}: ${errorMessage}`);
    //                 }
    //             }

    //             this.logger.log(`Download summary for specification ${spec.specificationId}: ${downloadedCount} downloaded, ${skippedCount} skipped (unchanged)`);

    //             if (connectorImport.files.length > 0) {
    //                 connectorImports.push(connectorImport);
    //             }
    //         }

    //         return { imports: connectorImports, metadata: downloadedFilesMetadata };

    //     } finally {
    //         await client.end();
    //     }
    // }



    /**
    * Check if a file has changed since the last download
    * Returns true if the file should be downloaded
    */
    private hasFileChanged(fileName: string, modifiedDate: Date, size: number, lastKnownExecutionActivity: FileServerExecutionActivityVo): boolean {
        const lastKnownFile = lastKnownExecutionActivity.processedFiles.find(item => item.remoteFileMetadata.fileName === fileName);

        if (!lastKnownFile) {
            return true; // File is new, download it
        } else {
            const lastKnownRemoteFile = lastKnownFile.remoteFileMetadata
            // Compare modification date and size
            const hasDateChanged = modifiedDate.getTime() !== new Date(lastKnownRemoteFile.modifiedDate).getTime();
            const hasSizeChanged = size !== lastKnownRemoteFile.size;

            return hasDateChanged || hasSizeChanged;
        }
    }

    /**
     * Download file via HTTP/HTTPS
     */
    // private async downloadFileHttp(connector: ViewConnectorSpecificationDto): Promise<ConnectorImport[]> {

    // TODO. Implement similar functionality to `downloadFileOverFtp` but using the `axios` package


    // const url = ''; //`${connector.protocol}://${connector.serverIPAddress}:${connector.port}${connector.extraMetadata?.apiEndpoint || '/'}`;
    // const tmpDir = path.join(process.cwd(), 'temp', 'connector-imports');
    // await fs.mkdir(tmpDir, { recursive: true });

    // const localPath = path.join(tmpDir, `connector_${connector.id}_${Date.now()}.csv`);

    // this.logger.log(`Downloading from ${url}`);

    // const response = await axios.get(url, {
    //     timeout: connector.timeout * 1000,
    //     auth: {
    //         username: '', //connector.username,
    //         password: '' //connector.password,
    //     },
    //     responseType: 'stream',
    // });

    // const writer = require('fs').createWriteStream(localPath);
    // response.data.pipe(writer);

    // return new Promise((resolve, reject) => {
    //     writer.on('finish', () => {
    //         this.logger.log(`Downloaded file to ${localPath}`);
    //         resolve(localPath);
    //     });
    //     writer.on('error', reject);
    // });

    //    return [];
    //}
}

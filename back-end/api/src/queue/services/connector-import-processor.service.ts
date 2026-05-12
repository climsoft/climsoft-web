import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorJobPayloadDto, JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ObservationImportService } from 'src/observation/services/observations-import.service';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationModel } from 'src/metadata/connector-specifications/dtos/view-connector-specification.model';
import { ServerTypeEnum, ImportFileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { FileMetadataVo, ImportFileProcessingResultVo, ImportFileServerExecutionActivityVo } from '../entity/connector-execution-log.entity';

import { ConnectorExecutionLogService, CreateConnectorExecutionLogDto } from './connector-execution-log.service';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';

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
    @OnEvent('connector.import', { suppressErrors: false })
    public async handleImportJob(job: JobQueueEntity) {

        try {
            const payload = job.payload as ConnectorJobPayloadDto;
            const connector: ViewConnectorSpecificationModel = this.connectorService.find(payload.connectorId, false);
            
            this.logger.log(`Processing import job: ${job.id} for connector: ${connector.name}. Specs to be processed: ${connector.parameters.specifications.length}`);
            await this.processImportSpecifications(connector, job.entryUserId);
            this.logger.log(`Finished processing import job: ${job.id} for connector: ${connector.name}`);
        } catch (error) {
            this.logger.error(`Failed to process import job ${job.id}`, error);
            throw error; // Re-throw to mark job as failed
        }
    }

    /**
     * Process a single connector import specification
     */
    private async processImportSpecifications(connector: ViewConnectorSpecificationModel, userId: number) {

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

        //----------------------------------------     
        // Step 1. Download the files
        startTime = new Date().getTime();
        this.logger.log(`Downloading files from connector: ${connector.name}`);
        switch (connector.serverType) {
            case ServerTypeEnum.FILE_SERVER:
                await this.downloadFromFileServer(connector, newConnectorLog);
                break;
            case ServerTypeEnum.WEB_SERVER:
                // TODO
                break;
            default:
                throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
        }
        this.logger.log(`Completed downloading files from connector ${connector.name}. Time taken: ${new Date().getTime() - startTime} milliseconds`);

        //----------------------------------------
        // Step 2. Process downloaded files and import into database
        startTime = new Date().getTime();
        this.logger.log(`Processing and importing files from connector: ${connector.name}`);
        for (const importExecutionActivity of (newConnectorLog.executionActivities as ImportFileServerExecutionActivityVo[])) {
            for (const file of importExecutionActivity.processedFiles) {

                // If not downloaded due to errors then skip processing
                if (!file.downloadedFileName || !file.operationId) {
                    continue;
                }

                try {
                    const op: OperationContext = this.fileIOService.getOperationContext(file.operationId as crypto.UUID);
                    const inputFilePathName = path.posix.join(op.inputDir, file.downloadedFileName);
                    this.logger.log(`Processing file ${inputFilePathName}`);
                    const result: FileProcessingError | void = await this.observationImportService.processFileForImport(importExecutionActivity.specificationId, inputFilePathName, op.intermediateDir, op.outputDir, userId, importExecutionActivity.stationId || null);

                    // If there is any errors, then just log the error message
                    if (result) {
                        file.errorMessage = result.message;
                        newConnectorLog.totalErrors++;
                        continue;
                    }

                    // Import to database from the operation's output directory
                    const outputFiles: string[] = await fs.promises.readdir(op.outputDir);

                    if (outputFiles.length == 0) {
                        file.errorMessage = 'No files processed';
                        newConnectorLog.totalErrors++;
                        continue;
                    }

                    const fileName: string = outputFiles[0];
                    const apiProcessedFilePathName = path.posix.join(op.outputDir, fileName);
                    const dbProcessedFilePathName = path.posix.join(op.dbOutputDir, fileName);
                    await this.observationImportService.importProcessedFileToDatabase(dbProcessedFilePathName);

                    const fileStats = await fs.promises.stat(apiProcessedFilePathName);
                    file.processedFileMetadata = {
                        fileName: outputFiles[0],
                        modifiedDate: fileStats.mtime.toISOString(),
                        size: fileStats.size,
                    };
                    this.logger.log(`Successfully processed and imported file ${file.downloadedFileName}`);

                } catch (error) {
                    let errorMessage: string = error instanceof Error ? error.message : String(error);
                    errorMessage = `Failed to process file ${file.remoteFileMetadata.fileName}: ${errorMessage}`;
                    file.errorMessage = errorMessage;
                    newConnectorLog.totalErrors++;
                    this.logger.error(errorMessage);
                }
            }
        }
        this.logger.log(`Completed processing and importing file form connector ${connector.name}. Time taken: ${new Date().getTime() - startTime} milliseconds`);

        // Step 4. Save the new the connector log
        newConnectorLog.executionEndDatetime = new Date();
        await this.connectorExecutionLogService.create(newConnectorLog);
    }


    private async downloadFromFileServer(connector: ViewConnectorSpecificationModel, newConnectorLog: CreateConnectorExecutionLogDto): Promise<void> {
        // Get last known processed files for file change detection
        let lastKnownConnectorLog = await this.connectorExecutionLogService.findLatestByConnector(connector.id);
        const lastProcessedRemoteFiles = new Map<string, FileMetadataVo>();
        if (lastKnownConnectorLog) {
            for (const executionActivity of (lastKnownConnectorLog.executionActivities as ImportFileServerExecutionActivityVo[])) {
                for (const files of executionActivity.processedFiles) {
                    // Skip files that had errors during last processing
                    if (!files.errorMessage) {
                        lastProcessedRemoteFiles.set(files.remoteFileMetadata.fileName, files.remoteFileMetadata);
                    }
                }
            }
        }

        // Depending on protocol. Download files
        switch ((connector.parameters as ImportFileServerParametersDto).protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                await this.downloadFileOverFtp(connector, newConnectorLog, lastProcessedRemoteFiles);
                break;
            case FileServerProtocolEnum.SFTP:
                await this.downloadFileOverSftp(connector, newConnectorLog, lastProcessedRemoteFiles);
                break;
            default:
                throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
        }
    }

    private async downloadFileOverFtp(
        connector: ViewConnectorSpecificationModel,
        newConnectorLog: CreateConnectorExecutionLogDto,
        lastProcessedRemoteFiles: Map<string, FileMetadataVo>): Promise<void> {
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();

        let startTime: number = new Date().getTime();
        try {
            const connectorParams = connector.parameters as ImportFileServerParametersDto;

            // Step 1: Connect to FTP server
            this.logger.log(`Connecting to FTP server ${connector.name}`);
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

            this.logger.log(`Connecting to FTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);

            // Set the working directory
            await client.cd(connectorParams.remotePath);

            // Step 2: Get the list of files in remote directory (with optional recursion)
            startTime = new Date().getTime();
            this.logger.log(`Getting file lists from from FTP server ${connector.name}`);
            const fileList = connectorParams.recursive
                ? await this.listFtpFilesRecursively(client, '.')
                : await client.list();
            this.logger.log(`File lists for FTP server ${connector.name} successfully retrieved. Found ${fileList.length} files and took ${Date.now() - startTime} milliseconds`);

            // Step 3: Map FTP file list to RemoteFileMetadataVo[]
            const remoteFiles: FileMetadataVo[] = fileList.map((file: any) => ({
                fileName: file.name,
                modifiedDate: (file.modifiedAt || new Date()).toISOString(),
                size: file.size || 0
            }));

            // Step 4: Process specifications and download files
            startTime = new Date().getTime();
            this.logger.log(`Downloading files from FTP server ${connector.name}`);
            await this.downloadFileFromFileServer(
                connector,
                connectorParams,
                remoteFiles,
                lastProcessedRemoteFiles,
                newConnectorLog,
                async (fileName: string, localPath: string) => {
                    await client.downloadTo(localPath, fileName);
                }
            );
            this.logger.log(`Downloading from FTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);
        } finally {
            client.close();
        }
    }

    private async downloadFileOverSftp(
        connector: ViewConnectorSpecificationModel,
        newConnectorLog: CreateConnectorExecutionLogDto,
        lastProcessedRemoteFiles: Map<string, FileMetadataVo>): Promise<void> {
        const client = new SftpClient();

        let startTime: number = new Date().getTime();
        try {
            const connectorParams = connector.parameters as ImportFileServerParametersDto;

            // Step 1: Connect to SFTP server
            this.logger.log(`Connecting to SFTP server ${connector.name}`);
            await client.connect({
                host: connector.hostName,
                port: connector.parameters.port,
                username: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
                readyTimeout: connector.timeout ? connector.timeout * 1000 : undefined,
            });
            this.logger.log(`Connecting to SFTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);

            // Step 2: Get the list of files in remote directory (with optional recursion)
            startTime = new Date().getTime();
            this.logger.log(`Getting file lists from from SFTP server ${connector.name}`);
            const fileList = connectorParams.recursive
                ? await this.listSftpFilesRecursively(client, connectorParams.remotePath)
                : await client.list(connectorParams.remotePath);

            this.logger.log(`File lists for SFTP server ${connector.name} successfully retrieved. Found ${fileList.length} files and took ${Date.now() - startTime} milliseconds`);

            // Step 3: Map SFTP file list to RemoteFileMetadataVo[]
            const remoteFiles: FileMetadataVo[] = fileList.map((file: any) => ({
                fileName: file.name,
                modifiedDate: new Date(file.modifyTime || Date.now()).toISOString(), // SFTP returns modifyTime as milliseconds since epoch
                size: file.size || 0
            }));

            // Step 4: Process specifications and download files
            startTime = new Date().getTime();
            this.logger.log(`Downloading files from SFTP server ${connector.name}`);
            await this.downloadFileFromFileServer(
                connector,
                connectorParams,
                remoteFiles,
                lastProcessedRemoteFiles,
                newConnectorLog,
                async (fileName: string, localPath: string) => {
                    // SFTP requires the full remote path on every operation because the SFTP client
                    // (ssh2-sftp-client) is stateless — it has no concept of a working directory.
                    // FTP differs because basic-ftp supports `client.cd()` (set earlier in
                    // downloadFileOverFtp), which makes subsequent operations relative to that directory.
                    // That's also why list operations differ: FTP lists with '.', SFTP lists with the full path.
                    const remoteFilePath = path.posix.join(connectorParams.remotePath, fileName);
                    await client.get(remoteFilePath, localPath);
                }
            );
            this.logger.log(`Downloading from SFTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);
        } finally {
            await client.end();
        }
    }



    /**
     * Process file specifications and download matching files
     * Common handler that works with normalized file metadata from any protocol
     */
    private async downloadFileFromFileServer(
        connector: ViewConnectorSpecificationModel,
        connectorParams: ImportFileServerParametersDto,
        remoteFiles: FileMetadataVo[],
        lastProcessedRemoteFiles: Map<string, FileMetadataVo>,
        newConnectorLog: CreateConnectorExecutionLogDto,
        downloadFile: (fileName: string, localPath: string) => Promise<void>
    ): Promise<void> {

        for (const spec of connectorParams.specifications) {
            // Step 3: Find matching files by converting the user's glob pattern to a regex.
            // First, escape all regex-special characters (e.g. "." becomes "\." so it matches a literal dot, not "any character"). 
            // Then replace the glob wildcard "*" with ".*" (which means "any sequence of characters" in regex). 
            // Finally, anchor with "^" and "$" so the pattern matches the full file name (e.g. "*.csv" won't match "data.csv.bak").
            // Examples:
            //   "*.csv"       → "^.*\.csv$"       → matches "data.csv", "report.csv"
            //   "data_*.txt"  → "^data_.*\.txt$"   → matches "data_01.txt", "data_abc.txt"
            //   "report.csv"  → "^report\.csv$"    → matches only "report.csv" (not "reportXcsv")
            const regexPattern: string = '^' + spec.filePattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
            const matchingFiles: FileMetadataVo[] = remoteFiles.filter(file =>
                path.basename(file.fileName).match(new RegExp(regexPattern))
            );

            if (matchingFiles.length === 0) {
                this.logger.warn(`No files found matching pattern ${spec.filePattern} for connector ${connector.name}`);
                continue;
            }

            // Step 4: Check file changes and download only modified files
            this.logger.log(`Found ${matchingFiles.length} file(s) matching pattern ${spec.filePattern}`);

            const newExecutionActivity: ImportFileServerExecutionActivityVo = {
                filePattern: spec.filePattern,
                specificationId: spec.specificationId,
                stationId: spec.stationId,
                processedFiles: [],
            };

            for (const remoteFile of matchingFiles) {
                const fileProcessingResult: ImportFileProcessingResultVo = {
                    remoteFileMetadata: remoteFile
                };

                if (!this.hasFileChanged(remoteFile, lastProcessedRemoteFiles)) {
                    this.logger.warn(`Skipping unchanged file: ${remoteFile.fileName}`);
                    fileProcessingResult.unchangedFile = true;
                } else {
                    try {
                        // Create an operation directory for this file
                        const op: OperationContext = await this.fileIOService.createOperation();
                        const downloadedFileName: string = path.basename(remoteFile.fileName);
                        const localDownloadFilePathName: string = path.posix.join(op.inputDir, downloadedFileName);
                        await downloadFile(remoteFile.fileName, localDownloadFilePathName);
                        fileProcessingResult.operationId = op.operationId;
                        fileProcessingResult.downloadedFileName = downloadedFileName;
                        this.logger.log(`Downloaded file ${remoteFile.fileName} to ${localDownloadFilePathName}`);
                    } catch (error) {
                        let errorMessage: string = error instanceof Error ? error.message : String(error);
                        errorMessage = `Failed to download file ${remoteFile.fileName}: ${errorMessage}`;
                        fileProcessingResult.errorMessage = errorMessage;
                        newConnectorLog.totalErrors++;
                        this.logger.error(errorMessage);
                    }
                }
                newExecutionActivity.processedFiles.push(fileProcessingResult);
            }

            newConnectorLog.executionActivities.push(newExecutionActivity);
        }
    }

    /**
    * Check if a file has changed since the last download
    * Returns true if the file should be downloaded
    */
    private hasFileChanged(remoteFile: FileMetadataVo, lastProcessedRemoteFiles: Map<string, FileMetadataVo>): boolean {
        // Get the last processed file metadata from the map
        const lastProcessedRemoteFile = lastProcessedRemoteFiles.get(remoteFile.fileName);

        if (!lastProcessedRemoteFile) {
            return true; // File is new, download it
        } else {
            // Compare modification date and size
            const hasDateChanged = new Date(remoteFile.modifiedDate).getTime() !== new Date(lastProcessedRemoteFile.modifiedDate).getTime();
            const hasSizeChanged = remoteFile.size !== lastProcessedRemoteFile.size;

            return hasDateChanged || hasSizeChanged;
        }
    }

    /**
     * Recursively list all files in FTP directory and subdirectories
     * Returns flat list with relative paths from the base directory
     */
    private async listFtpFilesRecursively(client: FtpClient, relativePath: string): Promise<any[]> {
        const allFiles: any[] = [];

        try {
            const items = await client.list(relativePath);

            for (const item of items) {
                const itemPath = relativePath === '.' ? item.name : path.posix.join(relativePath, item.name);

                if (item.isDirectory) {
                    // Recursively list subdirectory
                    const subFiles = await this.listFtpFilesRecursively(client, itemPath);
                    allFiles.push(...subFiles);
                } else if (item.isFile) {
                    // Add file with relative path
                    allFiles.push({
                        ...item,
                        name: itemPath // Override name with full relative path
                    });
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to list directory ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return allFiles;
    }

    /**
     * Recursively list all files in SFTP directory and subdirectories
     * Returns flat list with relative paths from the base directory
     */
    private async listSftpFilesRecursively(client: any, basePath: string, relativePath: string = ''): Promise<any[]> {
        const allFiles: any[] = [];
        const currentPath = relativePath ? path.posix.join(basePath, relativePath) : basePath;

        try {
            const items = await client.list(currentPath);

            for (const item of items) {
                // Skip . and .. entries
                if (item.name === '.' || item.name === '..') {
                    continue;
                }

                const itemRelativePath = relativePath ? path.posix.join(relativePath, item.name) : item.name;

                if (item.type === 'd') {
                    // Recursively list subdirectory
                    const subFiles = await this.listSftpFilesRecursively(client, basePath, itemRelativePath);
                    allFiles.push(...subFiles);
                } else if (item.type === '-') {
                    // Add file with relative path
                    allFiles.push({
                        ...item,
                        name: itemRelativePath // Override name with relative path from base
                    });
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to list directory ${currentPath}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return allFiles;
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

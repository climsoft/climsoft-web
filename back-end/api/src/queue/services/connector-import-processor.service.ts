import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorJobPayloadDto } from 'src/metadata/connector-specifications/dtos/connector-job-payload.dto';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ObservationImportService } from 'src/observation/services/observations-import.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { EndPointTypeEnum, FileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { DataSource } from 'typeorm';
import { FileIOService } from 'src/shared/services/file-io.service';

interface ConnectorImport {
    specificationId: number;
    files: {
        downloadedFile: string;
        processedFile: string;
    }[];
    stationId?: string;

}

@Injectable()
export class ConnectorImportProcessorService {
    private readonly logger = new Logger(ConnectorImportProcessorService.name);

    constructor(
        private fileIOService: FileIOService,
        private connectorService: ConnectorSpecificationsService,
        private observationImportService: ObservationImportService,
    ) { }

    /**
     * Handle connector import jobs
     */
    @OnEvent('connector.import')
    public async handleImportJob(job: JobQueueEntity) {
        const payload = job.payload as ConnectorJobPayloadDto;

        this.logger.log(`Processing import job for connector ${payload.connectorId}`);

        const connector: ViewConnectorSpecificationDto = await this.connectorService.find(payload.connectorId);

        try {
            await this.processImportSpecification(connector, job.entryUserId);
        } catch (error) {
            this.logger.error(`Failed to process import job for connector ${payload.connectorId}`, error);
            throw error; // Re-throw to mark job as failed
        }

    }

    /**
     * Process a single import specification
     */
    private async processImportSpecification(connector: ViewConnectorSpecificationDto, userId: number) {

        //this.logger.log(`Processing import specification ${specId} for connector ${connector.id}`);
        let connectorImports: ConnectorImport[] = [];
        switch (connector.endPointType) {
            case EndPointTypeEnum.FILE_SERVER:
                await this.downloadAndprocessFromFileServer(connector, userId);
                break;
            case EndPointTypeEnum.WEB_SERVER:
                // TODO
                break;
            default:
                throw new Error(`Unsupported end point type: ${connector.endPointType}`);
        }

         // Process dowloaded files and save them as processed files
        for (const connectorImport of connectorImports) {          
            for (const filePaths of connectorImport.files) {
                filePaths.processedFile = path.join(this.fileIOService.apiImportsDir, `connector_${connector.id}_spec_${connectorImport.specificationId}_processed.csv`);
                try {
                      this.logger.log(`Processing file ${path.basename(filePaths.downloadedFile)} into ${path.basename(filePaths.processedFile)}`);
                    await this.observationImportService.processFileForImport(
                        connectorImport.specificationId,
                        filePaths.downloadedFile,
                        filePaths.processedFile,
                        userId,
                        connectorImport.stationId);
                    this.logger.log(`Successfully processed file ${path.basename(filePaths.downloadedFile)} into ${path.basename(filePaths.processedFile)}`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw new Error(`Failed to process file ${path.basename(filePaths.downloadedFile)} for specification ${connectorImport.specificationId}: ${errorMessage}`);
                }
            }
        }

        // Import all processed files into database
         this.logger.log(`Starting bulk import of ${connectorImports.length} connector import(s) for connector ${connector.id}`);
        for (const connectorImport of connectorImports) {

            const processedFiles: string[] = connectorImport.files.map(file => file.processedFile);
            await this.observationImportService.importProcessedFilesToDatabase(processedFiles);

            // for (const filePaths of connectorImport.files) {
            //     // Clean up the processed file after successful import
            //     fs.unlink(filePaths.processedFile).catch(err =>
            //         this.logger.warn(`Failed to delete processed file ${filePaths.processedFile}`, err)
            //     );

            //     // Clean up the downloaded file
            //     fs.unlink(filePaths.downloadedFile).catch(err =>
            //         this.logger.warn(`Failed to delete downloaded file ${filePaths.downloadedFile}`, err)
            //     );
            // }
        }

        this.logger.log(`Completed bulk import for connector ${connector.id}`);
    }

    private async downloadAndprocessFromFileServer(connector: ViewConnectorSpecificationDto, userId: number): Promise<ConnectorImport[]> {
        const connectorParams: FileServerParametersDto = connector.parameters as FileServerParametersDto;
        switch (connectorParams.protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                return await this.downloadFileOverFtp(connector); ;
            case FileServerProtocolEnum.SFTP:
                return await this.downloadFileOverSftp(connector); 
            default:
                throw new Error(`Unsupported end point type: ${connector.endPointType}`);
        }  
    }


    /**
    * Download file via FTP
    */
    private async downloadFileOverFtp(connector: ViewConnectorSpecificationDto): Promise<ConnectorImport[]> {
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
            const fileList = await client.list();;

            this.logger.log(`File lists for FTP server ${connector.name} successfully retrieved. Found: ${fileList.length}`);

            // Holds sepcification id, remote file name and local file name 
            const connectorImports: ConnectorImport[] = [];

            for (const spec of connectorParams.specifications) {

                // Step 3: Find matching files
                const matchingFiles = fileList.filter(file =>
                    file.name.match(new RegExp(spec.filePattern.replace(/\*/g, '.*')))
                );

                if (matchingFiles.length === 0) {
                    throw new Error(`No files found matching pattern ${spec.filePattern}`);
                }

                const connectorImport: ConnectorImport = {
                    specificationId: spec.specificationId,
                    stationId: spec.stationId,
                    files: []
                };

                // Step 4: Download all matching files for each specification
                this.logger.log(`Downloading ${matchingFiles.length} file(s) for specification ${spec.specificationId}`);
                for (const remoteFile of matchingFiles) {
                    const localDownloadPath = path.join(this.fileIOService.apiImportsDir, `connector_${connector.id}_spec_${spec.specificationId}_download_${remoteFile.name}`);
                    try {
                        await client.downloadTo(localDownloadPath, remoteFile.name);
                        this.logger.log(`Downloaded file ${remoteFile.name} to ${localDownloadPath}`);
                        connectorImport.files.push({ downloadedFile: localDownloadPath, processedFile: '' });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        throw new Error(`Failed to download file ${remoteFile.name} for specification ${spec.specificationId}: ${errorMessage}`);
                    }
                }

                connectorImports.push(connectorImport);
            }

            return connectorImports;

        } finally {
            client.close();
        }
    }


    /**
     * Download file via SFTP
     */
    private async downloadFileOverSftp(connector: ViewConnectorSpecificationDto): Promise<ConnectorImport[]> {
        const client = new SftpClient();
        try {
            const connectorParams = connector.parameters as FileServerParametersDto;

            // Step 1: Connect to SFTP server
            await client.connect({
                host: connector.hostName,
                port: connector.parameters.port,
                username: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
                readyTimeout: connector.timeout * 1000,
            });

            this.logger.log(`Connected to SFTP server ${connector.name}`);

            // Step 2: Get the list of files in remote directory
            const fileList = await client.list(connectorParams.remotePath);

            this.logger.log(`File lists for SFTP server ${connector.name} successfully retrieved. Found: ${fileList.length}`);

            // Holds specification id, remote file name and local file name
            const connectorImports: ConnectorImport[] = [];

            for (const spec of connectorParams.specifications) {

                // Step 3: Find matching files
                const matchingFiles = fileList.filter((file: any) =>
                    file.name.match(new RegExp(spec.filePattern.replace(/\*/g, '.*')))
                );

                if (matchingFiles.length === 0) {
                    throw new Error(`No files found matching pattern ${spec.filePattern}`);
                }

                const connectorImport: ConnectorImport = {
                    specificationId: spec.specificationId,
                    stationId: spec.stationId,
                    files: []
                };

                // Step 4: Download all matching files for each specification
                this.logger.log(`Downloading ${matchingFiles.length} file(s) for specification ${spec.specificationId}`);
                for (const remoteFile of matchingFiles) {
                    const remoteFilePath = path.posix.join(connectorParams.remotePath, remoteFile.name);
                    const localDownloadPath = path.join(this.fileIOService.apiImportsDir, `connector_${connector.id}_spec_${spec.specificationId}_download_${remoteFile.name}`);

                    try {
                        await client.get(remoteFilePath, localDownloadPath);
                        this.logger.log(`Downloaded file ${remoteFile.name} to ${localDownloadPath}`);
                        connectorImport.files.push({ downloadedFile: localDownloadPath, processedFile: '' });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        throw new Error(`Failed to download file ${remoteFile.name} for specification ${spec.specificationId}: ${errorMessage}`);
                    }
                }

                connectorImports.push(connectorImport);
            }

            return connectorImports;

        } finally {
            await client.end();
        }
    }

    /**
     * Download file via HTTP/HTTPS
     */
    private async downloadFileHttp(connector: ViewConnectorSpecificationDto): Promise<ConnectorImport[]> {

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

        return [];
    }


    /**
  * Import processed CSV files to database using PostgreSQL COPY command
  */
    private async importProcessedFilesToDatabase1(connectorImports: ConnectorImport[], connectorId: number): Promise<void> {
       
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorJobPayloadDto } from 'src/metadata/connector-specifications/dtos/connector-job-payload.dto';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ObservationImportService } from 'src/observation/services/observation-import.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInfo, Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { ViewSourceDto } from 'src/metadata/source-specifications/dtos/view-source.dto';
import { ConnectorTypeEnum, EndPointTypeEnum, FileServerParametersDto, FileServerProtocolEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { map } from 'rxjs';
import { FileIOService } from 'src/shared/services/file-io.service';

interface ConnectorImports {
    specificationId: number;
    files: {
        sourceFile: string;
        processedFile: string;
    };

}

@Injectable()
export class ConnectorImportProcessorService {
    private readonly logger = new Logger(ConnectorImportProcessorService.name);

    constructor(
        private connectorService: ConnectorSpecificationsService,
        private sourceService: SourceSpecificationsService,
        private observationImportService: ObservationImportService,
    ) { }

    /**
     * Handle connector import jobs
     */
    @OnEvent('connector.import')
    public async handleImportJob(job: JobQueueEntity) {

        if (1 == 1) {
            this.logger.log(`import done successfully`);
            return;
        }

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


        // Get source specification
        //const sourceSpec: ViewSourceDto = await this.sourceService.find(specId);

        // Download file based on protocol
        let localFilePath: string; // TODO. Can be a set of files
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

        // try {
        //     // Process the downloaded file using ObservationImportService
        //     const file: Express.Multer.File = {
        //         fieldname: 'file',
        //         originalname: path.basename(localFilePath),
        //         encoding: '7bit',
        //         mimetype: 'text/csv',
        //         size: (await fs.stat(localFilePath)).size,
        //         buffer: await fs.readFile(localFilePath),
        //         destination: '',
        //         filename: path.basename(localFilePath),
        //         path: localFilePath,
        //         stream: null as any,
        //     };

        //     await this.observationImportService.processFile(
        //         sourceSpec.id,
        //         file,
        //         userId,
        //     );

        //     this.logger.log(`Successfully imported data from specification ${specId}`);

        // } finally {
        //     // Clean up temporary file
        //     await fs.unlink(localFilePath).catch(err =>
        //         this.logger.warn(`Failed to delete temporary file ${localFilePath}`, err)
        //     );
        // }
    }

    private async downloadAndprocessFromFileServer(connector: ViewConnectorSpecificationDto, userId: number): Promise<string> {
        const connectorParams: FileServerParametersDto = connector.parameters as FileServerParametersDto;

        switch (connectorParams.protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                await this.downloadFileFtp(connector, userId);
                break;
            case FileServerProtocolEnum.SFTP:
                await this.downloadFileSftp(connector);
                break;
            default:
                throw new Error(`Unsupported end point type: ${connector.endPointType}`);
        }

        return '';
    }




    /**
     * Download file via FTP
     */
    private async downloadFileFtp(connector: ViewConnectorSpecificationDto, userId: number): Promise<void> {
        const client = new FtpClient(connector.timeout * 1000);

        const connectorParams = connector.parameters as FileServerParametersDto;
        const remotePath = connectorParams.remotePath;

        const filePattern = connectorParams.specifications[0].filePattern || '*';
        const tmpDownloadsDir = path.join(process.cwd(), 'temp', 'connector-downloads');
        const tmpPocessedsDir = path.join(process.cwd(), 'temp', 'connector-imports');
        await fs.mkdir(tmpDownloadsDir, { recursive: true });
        await fs.mkdir(tmpPocessedsDir, { recursive: true });

        try {
            // Connect to FTP server
            await client.access({
                host: connector.hostName,
                port: connector.parameters.port,
                user: connector.parameters.username,
                password: connector.parameters.password,
                secure: connectorParams.protocol === FileServerProtocolEnum.FTPS,
            });

            this.logger.log(`Connected to FTP server ${connector.hostName}`);

            // Set the working directory
            await client.cd(remotePath);

            // Get the list of files in remote directory and set the corresponding source
            const fileList: FileInfo[] = await client.list();

            // Holds sepcification id, remote file name and local file name
            const sourceFiles: Map<number, FileInfo[]> = new Map<number, FileInfo[]>();

            for (const spec of connectorParams.specifications) {
                // Find matching files
                const matchingFiles: FileInfo[] = fileList.filter(file =>
                    file.name.match(new RegExp(spec.filePattern.replace('*', '.*')))
                );

                if (matchingFiles.length === 0) {
                    throw new Error(`No files found matching pattern ${filePattern}`);
                }

                sourceFiles.set(spec.specificationId, matchingFiles);
            }

            // Step 1: Download all matching files for each specification
            const downloadedFiles: Map<number, string[]> = new Map<number, string[]>();

            for (const [specificationId, files] of sourceFiles.entries()) {
                this.logger.log(`Downloading ${files.length} file(s) for specification ${specificationId}`);
                const localDownloadPaths: string[] = [];

                for (const remoteFile of files) {
                    const localDownloadPath = path.join(tmpDownloadsDir, `connector_${connector.id}_spec_${specificationId}_${remoteFile.name}`);

                    try {
                        await client.downloadTo(localDownloadPath, remoteFile.name);
                        this.logger.log(`Downloaded file ${remoteFile.name} to ${localDownloadPath}`);
                        localDownloadPaths.push(localDownloadPath);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        throw new Error(`Failed to download file ${remoteFile.name} for specification ${specificationId}: ${errorMessage}`);
                    }
                }

                downloadedFiles.set(specificationId, localDownloadPaths);
            }

            // Step 2: Process all downloaded files
            const processedFiles: Map<number, string[]> = new Map<number, string[]>();

            for (const [specificationId, localDownloadPaths] of downloadedFiles.entries()) {
                this.logger.log(`Processing ${localDownloadPaths.length} downloaded file(s) for specification ${specificationId}`);
                const localProcessedPaths: string[] = [];

                for (const localDownloadPath of localDownloadPaths) {
                    const localProcessedPath = path.join(tmpPocessedsDir, `connector_${connector.id}_spec_${specificationId}_.csv`);
                    try {

                        await this.observationImportService.processFileForImport(specificationId, localDownloadPath, localProcessedPath, userId);
                        this.logger.log(`Successfully processed file ${path.basename(localDownloadPath)} into ${path.basename(localProcessedPath)}`);
                        localProcessedPaths.push(localProcessedPath);

                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        throw new Error(`Failed to process file ${path.basename(localDownloadPath)} for specification ${specificationId}: ${errorMessage}`);
                    }
                }

                processedFiles.set(specificationId, localProcessedPaths);
            }

            // TODO. Initiate import of processed files

            // Clean up all the downloaded files after processing
            // await fs.unlink(localPath).catch(err =>
            //     this.logger.warn(`Failed to delete temporary file ${localPath}`, err)
            // );

        } finally {
            client.close();
        }
    }

    /**
     * Download file via SFTP
     */
    private async downloadFileSftp(connector: ViewConnectorSpecificationDto): Promise<string> {
        const client = new SftpClient();

        const connectExtraMetadata = connector.parameters as FileServerParametersDto;
        const remotePath = connectExtraMetadata.remotePath || '/';
        const filePattern = connectExtraMetadata.specifications[0].filePattern || '*';
        const tmpDir = path.join(process.cwd(), 'temp', 'connector-imports');
        await fs.mkdir(tmpDir, { recursive: true });

        try {
            // Connect to SFTP server
            await client.connect({
                //host: connectExtraMetadata.hostName,
                port: connectExtraMetadata.port,
                username: connectExtraMetadata.username,
                password: connectExtraMetadata.password,
                readyTimeout: connector.timeout * 1000,
            });

            //this.logger.log(`Connected to SFTP server ${connectExtraMetadata.hostName}`);

            // List files in remote directory
            const fileList = await client.list(remotePath);

            // Find matching files
            const regex = new RegExp(filePattern.replace('*', '.*'));
            const matchingFiles = fileList.filter((file: any) => file.name.match(regex));

            if (matchingFiles.length === 0) {
                throw new Error(`No files found matching pattern ${filePattern}`);
            }

            // Download the first matching file
            const remoteFile = matchingFiles[0];
            const remoteFilePath = path.posix.join(remotePath, remoteFile.name);
            const localPath = path.join(tmpDir, `connector_${connector.id}_${remoteFile.name}`);

            await client.get(remoteFilePath, localPath);
            this.logger.log(`Downloaded file ${remoteFile.name} to ${localPath}`);

            return localPath;

        } finally {
            await client.end();
        }
    }

    /**
     * Download file via HTTP/HTTPS
     */
    private async downloadFileHttp(connector: ViewConnectorSpecificationDto): Promise<string> {
        const url = ''; //`${connector.protocol}://${connector.serverIPAddress}:${connector.port}${connector.extraMetadata?.apiEndpoint || '/'}`;
        const tmpDir = path.join(process.cwd(), 'temp', 'connector-imports');
        await fs.mkdir(tmpDir, { recursive: true });

        const localPath = path.join(tmpDir, `connector_${connector.id}_${Date.now()}.csv`);

        this.logger.log(`Downloading from ${url}`);

        const response = await axios.get(url, {
            timeout: connector.timeout * 1000,
            auth: {
                username: '', //connector.username,
                password: '' //connector.password,
            },
            responseType: 'stream',
        });

        const writer = require('fs').createWriteStream(localPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                this.logger.log(`Downloaded file to ${localPath}`);
                resolve(localPath);
            });
            writer.on('error', reject);
        });
    }
}

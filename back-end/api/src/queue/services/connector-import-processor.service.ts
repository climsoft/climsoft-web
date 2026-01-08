import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobQueueEntity } from '../entity/job-queue.entity';
import { ConnectorJobPayloadDto } from 'src/metadata/connector-specifications/dtos/connector-job-payload.dto';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ObservationImportService } from 'src/observation/services/observation-import.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { ViewSourceDto } from 'src/metadata/source-specifications/dtos/view-source.dto';
import { FTPMetadataDto } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';

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

        if (1 === 1) {
            // TODO. Delete this block.
            this.logger.log(`Import of ${job.name}, done`);
            return;
        }

        const payload = job.payload as ConnectorJobPayloadDto;
        this.logger.log(`Processing import job for connector ${payload.connectorId}`);

        const connector: ViewConnectorSpecificationDto = await this.connectorService.find(payload.connectorId);

        try {
            //await this.processImportSpecification(connector, connector.specificationId, job.entryUserId);
        } catch (error) {
            // this.logger.error(`Failed to process specification ${connector.specificationId}`, error);
            throw error; // Re-throw to mark job as failed
        }

    }

    /**
     * Process a single import specification
     */
    private async processImportSpecification(connector: ViewConnectorSpecificationDto, specId: number, userId: number) {
        this.logger.log(`Processing import specification ${specId} for connector ${connector.id}`);

        // Get source specification
        const sourceSpec: ViewSourceDto = await this.sourceService.find(specId);

        // Download file based on protocol
        let localFilePath: string; // TODO. Can be a set of files
        // switch (connector.protocol) {
        //     case ConnectorProtocolEnum.FTP:
        //     case ConnectorProtocolEnum.FTPS:
        //         localFilePath = await this.downloadFileFtp(connector);
        //         break;
        //     case ConnectorProtocolEnum.SFTP:
        //         localFilePath = await this.downloadFileSftp(connector);
        //         break;
        //     case ConnectorProtocolEnum.HTTP:
        //     case ConnectorProtocolEnum.HTTPS:
        //         localFilePath = await this.downloadFileHttp(connector);
        //         break;
        //     default:
        //         throw new Error(`Unsupported protocol: ${connector.protocol}`);
        // }

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

    /**
     * Download file via FTP
     */
    private async downloadFileFtp(connector: ViewConnectorSpecificationDto): Promise<string> {
        const client = new FtpClient();

        const connectExtraMetadata = connector.parameters as FTPMetadataDto;
        // TODO. Check how to timeout via the library
        // client.ftp.timeout = connector.timeout * 1000;
        const remotePath = connectExtraMetadata.remotePath || '/';
        const filePattern = connectExtraMetadata.specifications[0].filePattern || '*';
        const tmpDir = path.join(process.cwd(), 'temp', 'connector-imports');
        await fs.mkdir(tmpDir, { recursive: true });

        try {
            // Connect to FTP server
            await client.access({
                host: '',// connector.serverIPAddress,
                port: 0,//connector.port,
                user: '',// connector.username,
                password: '',// connector.password,
                //secure: connector.protocol === ConnectorProtocolEnum.FTPS,
            });

            //this.logger.log(`Connected to FTP server ${connectExtraMetadata.hostName}`);

            // List files in remote directory
            await client.cd(remotePath);
            const fileList = await client.list();

            // Find matching files
            const matchingFiles = fileList.filter(file =>
                file.name.match(new RegExp(filePattern.replace('*', '.*')))
            );

            if (matchingFiles.length === 0) {
                throw new Error(`No files found matching pattern ${filePattern}`);
            }

            // Download the first matching file
            const remoteFile = matchingFiles[0];
            const localPath = path.join(tmpDir, `connector_${connector.id}_${remoteFile.name}`);

            await client.downloadTo(localPath, remoteFile.name);
            this.logger.log(`Downloaded file ${remoteFile.name} to ${localPath}`);

            return localPath;

        } finally {
            client.close();
        }
    }

    /**
     * Download file via SFTP
     */
    private async downloadFileSftp(connector: ViewConnectorSpecificationDto): Promise<string> {
        const client = new SftpClient();

        const connectExtraMetadata = connector.parameters as FTPMetadataDto;
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

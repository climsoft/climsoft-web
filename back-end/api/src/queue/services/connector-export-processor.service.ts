import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobPayloadDto, JobQueueEntity } from '../entity/job-queue.entity'; 
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ExportSpecificationsService } from 'src/metadata/export-specifications/services/export-specifications.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import axios from 'axios';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { ImportFileServerParametersDto } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { ViewSpecificationExportDto } from 'src/metadata/export-specifications/dtos/view-export-specification.dto';

@Injectable()
export class ConnectorExportProcessorService {
    private readonly logger = new Logger(ConnectorExportProcessorService.name);

    constructor(
        private connectorService: ConnectorSpecificationsService,
        private exportService: ExportSpecificationsService,
        private connectorExportProcessorService: ConnectorExportProcessorService,
    ) { }

    /**
     * Handle connector export jobs
     */
    @OnEvent('connector.export')
    async handleExportJob(job: JobQueueEntity) {


        const payload: JobPayloadDto = job.payload ;
        this.logger.log(`Processing export job for connector ${payload.payLoadId}`);

        const connector: ViewConnectorSpecificationDto = await this.connectorService.find(payload.payLoadId);

        try {
            //await this.processExportSpecification(connector, connector.specificationId, job.entryUserId);
        } catch (error) {
            // this.logger.error(`Failed to process export specification ${connector.specificationId}`, error);
            throw error; // Re-throw to mark job as failed
        }

    }

    /**
     * Process a single export specification
     */
    private async processExportSpecification(connector: ViewConnectorSpecificationDto, specId: number, userId: number) {
        this.logger.log(`Processing export specification ${specId} for connector ${connector.id}`);

        // Get export specification
        const exportSpec: ViewSpecificationExportDto = await this.exportService.find(specId);

        // TODO: Generate export file using ExportObservationsService
        // For now, we'll create a placeholder
        const tmpDir = path.join(process.cwd(), 'temp', 'connector-exports');
        await fs.mkdir(tmpDir, { recursive: true });

        const fileName = `export_${connector.id}_${specId}_${Date.now()}.csv`;
        const localFilePath = path.join(tmpDir, fileName);

        // TODO: Replace this with actual export generation
        // await this.exportObservationsService.exportToFile(exportSpec, localFilePath);
        // For now, create a placeholder file
        await fs.writeFile(localFilePath, 'Placeholder export data\n');

        // try {
        //     // Upload file based on protocol
        //     switch (connector.protocol) {
        //         case ConnectorProtocolEnum.FTP:
        //         case ConnectorProtocolEnum.FTPS:
        //             await this.uploadFileFtp(connector, localFilePath);
        //             break;
        //         case ConnectorProtocolEnum.SFTP:
        //             await this.uploadFileSftp(connector, localFilePath);
        //             break;
        //         case ConnectorProtocolEnum.HTTP:
        //         case ConnectorProtocolEnum.HTTPS:
        //             await this.uploadFileHttp(connector, localFilePath);
        //             break;
        //         default:
        //             throw new Error(`Unsupported protocol: ${connector.protocol}`);
        //     }

        //     this.logger.log(`Successfully exported data for specification ${specId}`);

        // } finally {
        //     // Clean up temporary file
        //     await fs.unlink(localFilePath).catch(err =>
        //         this.logger.warn(`Failed to delete temporary file ${localFilePath}`, err)
        //     );
        // }
    }

    /**
     * Upload file via FTP
     */
    private async uploadFileFtp(connector: ViewConnectorSpecificationDto, localFilePath: string): Promise<void> {
        const client = new FtpClient();

        const connectExtraMetadata = connector.parameters as ImportFileServerParametersDto;
        // TODO. Check how to timeout via the library
        // client.ftp.timeout = connector.timeout * 1000;

        const remotePath = ''; // connector.extraMetadata?.uploadPath || '/';
        const fileNaming = ''; //connector.extraMetadata?.fileNaming || path.basename(localFilePath);
        const remoteFileName = fileNaming.replace('{timestamp}', Date.now().toString());

        // try {
        //     // Connect to FTP server
        //     await client.access({
        //         host: connectExtraMetadata.hostName,
        //         port: connectExtraMetadata.port,
        //         user: connectExtraMetadata.username,
        //         password: connectExtraMetadata.password,
        //         secure: connector.protocol === ConnectorProtocolEnum.FTPS,
        //     });

        //     this.logger.log(`Connected to FTP server ${connectExtraMetadata.hostName}`);

        //     // Change to upload directory
        //     await client.cd(remotePath);

        //     // Upload file
        //     await client.uploadFrom(localFilePath, remoteFileName);
        //     this.logger.log(`Uploaded file to ${remotePath}/${remoteFileName}`);

        // } finally {
        //     client.close();
        // }
    }

    /**
     * Upload file via SFTP
     */
    private async uploadFileSftp(connector: ViewConnectorSpecificationDto, localFilePath: string): Promise<void> {
        const client = new SftpClient();

        // const connectExtraMetadata = connector.parameters as FTPMetadataDto;
        // const remotePath = ''; //connectExtraMetadata.uploadPath || '/';
        // const fileNaming = ''; // connectExtraMetadata.fileNaming || path.basename(localFilePath);
        // const remoteFileName = fileNaming.replace('{timestamp}', Date.now().toString());

        // try {
        //     // Connect to SFTP server
        //     await client.connect({
        //         host: connectExtraMetadata.hostName,
        //         port: connectExtraMetadata.port,
        //         username: connectExtraMetadata.username,
        //         password: connectExtraMetadata.password,
        //         readyTimeout: connector.timeout * 1000,
        //     });

        //     this.logger.log(`Connected to SFTP server ${connectExtraMetadata.hostName}`);

        //     // Upload file
        //     const remoteFilePath = path.posix.join(remotePath, remoteFileName);
        //     await client.put(localFilePath, remoteFilePath);
        //     this.logger.log(`Uploaded file to ${remoteFilePath}`);

        // } finally {
        //     await client.end();
        // }
    }

    /**
     * Upload file via HTTP/HTTPS
     */
    private async uploadFileHttp(connector: ViewConnectorSpecificationDto, localFilePath: string): Promise<void> {
        const url = '';// `${connector.protocol}://${connector.serverIPAddress}:${connector.port}${connector.extraMetadata?.apiEndpoint || '/'}`;

        this.logger.log(`Uploading to ${url}`);

        const fileContent = await fs.readFile(localFilePath);
        const fileName = path.basename(localFilePath);

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fileContent, fileName);

        await axios.post(url, formData, {
            timeout: connector.timeout * 1000,
            auth: {
                username: '',// connector.username,
                password: '', // connector.password,
            },
            headers: formData.getHeaders(),
        });

        this.logger.log(`Uploaded file ${fileName} to ${url}`);
    }
}

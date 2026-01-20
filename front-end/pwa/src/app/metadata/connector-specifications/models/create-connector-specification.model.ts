
export enum ConnectorTypeEnum {
    IMPORT = 'import',
    EXPORT = 'export'
}

export enum EndPointTypeEnum {
    FILE_SERVER = 'file_server',
    WEB_SERVER = 'web_server',
    // MQTT_BROKER = 'mqtt_broker',
    // We can have other custom end points here like; wis2box, adcon_database, climsoft_web_server etc.
}

export enum FileServerProtocolEnum {
    SFTP = 'sftp',
    FTP = 'ftp',
    FTPS = 'ftps',
}

export enum WebServerProtocolEnum {
    HTTP = 'http',
    HTTPS = 'https',
}

export type ConnectorParameters = ImportFileServerParametersModel | ExportFileServerParametersModel;

export interface CreateConnectorSpecificationModel {
    name: string;

    description?: string;

    connectorType: ConnectorTypeEnum;

    endPointType: EndPointTypeEnum;


    hostName: string;

    timeout: number; // in seconds

    maximumRetries: number;

    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)


    orderNumber?: number; // Auto-generated if not provided


    parameters: ConnectorParameters;


    disabled?: boolean;

    comment?: string;
}

export interface FileServerParametersModel {
    protocol: FileServerProtocolEnum;

    port: number;

    username: string;

    password: string;

    remotePath: string;
}

export interface ImportFileServerParametersModel extends FileServerParametersModel {

    recursive?: boolean; // When true, files in subdirectories will be included

    specifications: ImportFileServerSpecificationModel[];
}

export interface ExportFileServerParametersModel extends FileServerParametersModel {
    observationPeriod: number; // In minutes

    specifications: ExportFileServerSpecificationModel[];
}

export interface ImportFileServerSpecificationModel {

    filePattern: string; // Will be used to check both single files and multiple files

    specificationId: number; // import source specification id

    stationId?: string; // Used by import only
}

export interface ExportFileServerSpecificationModel {

    specificationId: number; // export specification id

    filePattern: 'yyyymmddhhmmss'; // used to name the created csv file
}

export interface WebServerMetadataModel {

    protocol: WebServerProtocolEnum;


    token?: string;

    specifications: {
        specificationId: number;
        stationId?: string;
    };
}
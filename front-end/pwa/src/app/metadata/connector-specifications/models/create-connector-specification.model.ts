import { ConnectorTypeEnum } from "./connector-type.enum";

export type ConnectorParameters = FileServerParametersModel; // TODO. In future add other connector metadata types | HTTPMetadata ;

export interface CreateConnectorSpecificationModel {
    name: string;
    description?: string;
    connectorType: ConnectorTypeEnum;
    endPointType: EndPointTypeEnum;
    hostName: string;
    timeout: number; // in seconds
    maximumRetries: number;
    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)
    orderNumber?: number | null;
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
    recursive?: boolean;
    specifications: FileServerSpecificationModel[];
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

export interface FileServerSpecificationModel {
    filePattern: string; // Will be used to check both single files and multiple files
    specificationId: number;
    stationId?: string; // Used by import only
}








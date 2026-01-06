import { ConnectorTypeEnum } from "./connector-type.enum";
import { ConnectorProtocolEnum } from "./connector-protocol.enum";

export type ConnectorParameters = FTPMetadataModel; // TODO. In future add other connector metadata types | HTTPMetadata ;

export interface CreateConnectorSpecificationModel {
    name: string;
    description?: string;
    connectorType: ConnectorTypeEnum;
    protocol: ConnectorProtocolEnum;
    timeout: number; // in seconds
    maximumRetries: number;
    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)
    parameters: ConnectorParameters;
    disabled?: boolean;
    comment?: string;
}

export interface FTPMetadataModel {
    serverIPAddress: string;
    port: number;
    username: string;
    password: string;
    remotePath: string
    specifications: FTPSpecificationModel[];
}

export interface FTPSpecificationModel {
    filePattern: string; // Will be used to check both single files and multiple files
    specificationId: number;
    stationId?: string; // Used by import only
}






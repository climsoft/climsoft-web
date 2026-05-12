
export enum ConnectorTypeEnum {
    IMPORT = 'import',
    EXPORT = 'export'
}

export enum ServerTypeEnum {
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

/**
 * Which timestamp to compare a row's "recency" against when picking up
 * observations for an auto-export run:
 *  - OBSERVATION: when the reading was taken (date_time)
 *  - ENTRY:       when the reading was recorded in the system (entry_date_time)
 */
export enum ObservationWindowDateFieldEnum {
    OBSERVATION = 'observation',
    ENTRY = 'entry',
}

/**
 * Rolling time window each scheduled export run pulls observations from.
 * `durationMinutes` is the look-back length; `dateField` chooses which
 * row timestamp the window applies to.
 */
export interface ObservationWindowModel {
    durationMinutes: number;
    dateField: ObservationWindowDateFieldEnum;
}

export type ConnectorParameters = ImportFileServerParametersModel | ExportFileServerParametersModel;

export interface CreateConnectorSpecificationModel {
    name: string;

    description: string;

    connectorType: ConnectorTypeEnum;

    serverType: ServerTypeEnum;

    hostName: string;

    timeout: number; // in seconds

    retryAttempts: number;

    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    parameters: ConnectorParameters;

    disabled: boolean;

    comment: string | null;
}

export interface FileServerParametersModel {
    protocol: FileServerProtocolEnum;

    port: number;

    username: string;

    password: string;

    remotePath: string;
}

export interface ImportFileServerParametersModel extends FileServerParametersModel {

    recursive: boolean; // When true, files in subdirectories will be included

    specifications: ImportFileServerSpecificationModel[];
}

export interface ExportFileServerParametersModel extends FileServerParametersModel {
    observationWindow: ObservationWindowModel;

    specifications: ExportFileServerSpecificationModel[];
}

export interface ImportFileServerSpecificationModel {

    filePattern: string; // Will be used to check both single files and multiple files

    specificationId: number; // import source specification id

    stationId: string | null; // Used by import only
}

export interface ExportFileServerSpecificationModel {
    specificationId: number; // export specification id

    stationId: string | null;
}

export interface WebServerMetadataModel {

    protocol: WebServerProtocolEnum;


    token: string | null;

    specifications: {
        specificationId: number;
        stationId?: string;
    };
}
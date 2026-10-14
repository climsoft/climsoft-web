
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
    // Recursion is expressed per-spec in `filePattern` (a `**` segment), not a
    // connector-wide flag.
    specifications: ImportFileServerSpecificationModel[];
}

export interface ExportFileServerParametersModel extends FileServerParametersModel {
    observationWindow: ObservationWindowModel;

    specifications: ExportFileServerSpecificationModel[];
}

export interface ImportFileServerSpecificationModel {
    /**
     * The binding's id, assigned by the API. MUST be round-tripped unchanged on
     * save: it is how the server tells "this binding, edited" from "a new
     * binding". Dropping it would turn every save into delete-and-recreate, and
     * the next connector run would re-import the whole file server because the
     * de-duplication ledger is keyed on it.
     *
     * Undefined only for a row the user has just added and not yet saved.
     */
    id?: number;

    /**
     * Skip this binding on every run, leaving the connector's other bindings
     * working. Undefined means enabled.
     */
    disabled?: boolean;

    filePattern: string; // Will be used to check both single files and multiple files

    /**
     * File-name globs dropped from what `filePattern` matches, e.g. `*_info.csv`
     * for a description file beside the data files. Usually empty or absent.
     */
    excludePatterns?: string[];

    specificationId: number; // import source specification id

    stationId: string | null; // Used by import only
}

export interface ExportFileServerSpecificationModel {
    /** See ImportFileServerSpecificationModel.id. */
    id?: number;

    /** See ImportFileServerSpecificationModel.disabled. */
    disabled?: boolean;

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
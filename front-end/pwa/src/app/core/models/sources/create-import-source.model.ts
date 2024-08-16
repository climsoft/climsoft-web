export interface CreateImportSourceModel {
    serverType: ServerTypeEnum;
    format: FormatEnum;
}

export enum ServerTypeEnum {
    LOCAL = "local",
    BASE_STATION = "base_station",
    MESSAGE_SWITCH = "message_switch",
    DATABASE = "database",
    WEB_SERVER = "web_server"
}

export enum FormatEnum {
    TABULAR = "tabular",
    BUFR = "bufr",
    KEYVALUE = "key_value"
}
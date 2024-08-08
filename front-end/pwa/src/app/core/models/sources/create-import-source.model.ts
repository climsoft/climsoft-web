export interface CreateImportSourceModel {
    serverType: ServerTypeEnum;
    format: FormatEnum;
}

export enum ServerTypeEnum {
    LOCAL = "form",
    BASE_STATION = "base_station",
    MESSAGE_SWITCH = "message_switch",
    DATABASE = "database",
    API = "api"
}

export enum FormatEnum {
    TABULAR = "tabular",
    BUFR = "bufr",
    KEYVALUE = "key_value"
}
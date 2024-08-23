import { SourceDefinitionValidity } from "./create-update-source.model";

export interface CreateImportSourceModel extends SourceDefinitionValidity {
    serverType: ServerTypeEnum;
    
    format: FormatEnum;

     /**
     * Determines whether to scale the values. 
     * To be used when data being imported is not scaled
     */
     scaleValues: boolean;
     
     /**
      * source values that represent missing.
      * Applicable only when import of missing values is allowed.
      */
     sourceMissingValueFlags: string;

     importDefinitions: ImportDefinitionValidity;
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

export interface ImportDefinitionValidity {
    isValid(): boolean;
}



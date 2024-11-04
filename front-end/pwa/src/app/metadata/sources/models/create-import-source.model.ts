import { SourceParametersValidity } from "./create-update-source.model";

export interface CreateImportSourceModel extends SourceParametersValidity {

    dataStructureType: DataStructureTypeEnum;

    dataStructureParameters: DataStructureValidity;
     
     /**
      * source values that represent missing.
      * Applicable only when import of missing values is allowed.
      */
     sourceMissingValueFlags: string;

}

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr"
}

export interface DataStructureValidity {
    isValid(): boolean;
}

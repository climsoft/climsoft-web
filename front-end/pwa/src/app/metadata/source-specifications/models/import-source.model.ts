import { ImportSourceTabularParamsModel } from "./import-source-tabular-params.model";
import { SourceParametersValidity } from "./create-source.model";

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr",
}

export interface ImportSourceModel extends SourceParametersValidity {

    dataStructureType: DataStructureTypeEnum;

    // Later this can be extended to support other data structure types, for now it is only applicable to tabular.
    dataStructureParameters: ImportSourceTabularParamsModel;

    /**
     * source values that represent missing.
     * Applicable only when import of missing values is allowed.
     */
    sourceMissingValueFlags: string;

}



export interface DataStructureValidity {
    isValid(): boolean;
}

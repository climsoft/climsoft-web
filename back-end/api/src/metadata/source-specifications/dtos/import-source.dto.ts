import { ImportSourceTabularParamsDTO } from "./import-source-tabular-params.dto";

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr",
}

export class ImportSourceDTO  {
    dataStructureType: DataStructureTypeEnum;
    dataStructureParameters: ImportSourceTabularParamsDTO;

    /**
     * Source values that represent missing.
     * Applicable only when import of missing values is allowed.
     * Multiple missing values should be separated by commas. This means commas are not supported.
     */
    sourceMissingValueFlags: string;
}


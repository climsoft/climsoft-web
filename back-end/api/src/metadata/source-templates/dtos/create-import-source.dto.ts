import { SourceParametersValidity } from "./create-update-source.dto";


export class CreateImportSourceDTO implements SourceParametersValidity {
    dataStructureType: DataStructureTypeEnum;
    dataStructureParameters: DataStructureValidity;

    /**
     * Source values that represent missing.
     * Applicable only when import of missing values is allowed.
     * Multiple missing values should be separated by commas. This means commas are not supported.
     */
    sourceMissingValueFlags: string;

    isValid(): boolean {
        return this.dataStructureParameters.isValid();
    }
}

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr",
}

export interface DataStructureValidity {
    isValid(): boolean;
}
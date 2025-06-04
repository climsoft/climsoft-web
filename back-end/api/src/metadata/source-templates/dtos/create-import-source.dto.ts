import { SourceParametersValidity } from "./create-update-source.dto";


export class CreateImportSourceDTO implements SourceParametersValidity {
    dataStructureType: DataStructureTypeEnum;
    dataStructureParameters: DataStructureValidity;

    //TODO. Delete this and use the one that is in CreateUpdateSourceDto 
    scaleValues: boolean;

    /**
     * source values that represent missing.
     * Applicable only when import of missing values is allowed.
     */
    sourceMissingValueFlags: string;

    isValid(): boolean {
        return this.dataStructureParameters.isValid();
    }
}

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr"
}

export interface DataStructureValidity {
    isValid(): boolean;
}
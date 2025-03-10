import { SourceParametersValidity } from "./create-update-source.dto";


export class CreateImportSourceDTO implements SourceParametersValidity {
    dataStructureType: DataStructureTypeEnum;
    dataStructureParameters: DataStructureValidity;

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
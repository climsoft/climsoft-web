import { SourceParameters } from "./create-source-specification.model";
import { SourceTypeEnum } from "./source-type.enum";

export interface ViewSourceSpecificationModel {
    id: number;
    name: string;
    description: string;
    sourceType: SourceTypeEnum;
    parameters: SourceParameters;
    utcOffset: number;
    allowMissingValue: boolean;
    scaleValues: boolean;
    sampleFileName: string;
    adapterId: number | null;
    disabled: boolean;
    comment: string | null;
}

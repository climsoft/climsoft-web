
import { SourceTypeEnum } from "../enums/source-type.enum";
import { SourceParameters } from "./create-source-specification.dto";

export interface ViewSourceSpecificationModel {
    id: number;
    name: string;
    description: string;
    sourceType: SourceTypeEnum;
    parameters: SourceParameters;
    utcOffset: number;
    allowMissingValue: boolean;
    scaleValues: boolean;
    sampleFileName: string | null;
    adapterId: number | null;
    disabled: boolean;
    comment: string | null;
}
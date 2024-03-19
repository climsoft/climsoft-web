import { SourceTypeEnum } from "./enums/source-type.enum";

export interface CreateUpdateSourceModel {
    name: string;
    description: string;
    extraMetadata: string | null; //json
    sourceType: SourceTypeEnum; 
}
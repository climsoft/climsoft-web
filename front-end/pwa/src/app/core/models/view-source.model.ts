import { SourceTypeEnum } from "./enums/source-type.enum";

export interface ViewSourceModel {
    id: number;
    name: string;
    description: string;
    extraMetadata: string | null;
    sourceType: SourceTypeEnum;
    sourceTypeName: string;
}
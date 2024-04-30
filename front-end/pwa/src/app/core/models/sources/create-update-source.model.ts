import { SourceTypeEnum } from "./source-type.enum";

export interface CreateUpdateSourceModel<T extends object> {
    name: string;
    description: string;
    extraMetadata: T | null; //json
    sourceType: SourceTypeEnum; 
}
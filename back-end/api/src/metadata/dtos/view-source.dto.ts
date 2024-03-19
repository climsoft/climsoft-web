import { SourceTypeEnum } from "../enums/source-type.enum";


export class ViewSourceDto {
    id: number; 
    name: string; 
    description: string; 
    extraMetadata: string|null; 
    sourceType: SourceTypeEnum | null; 
}
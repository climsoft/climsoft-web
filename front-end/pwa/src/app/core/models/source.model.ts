export enum SourceTypeIdEnum {
    FORM = 1,
    IMPORT = 2,
    DIGITAL = 3,
}

export interface SourceModel {
    id: number;
    name: string;
    description: string;
    extraMetadata: string; //json
    sourceTypeId: SourceTypeIdEnum; //types allowed
}
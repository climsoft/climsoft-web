export interface SourceModel {
    id: number;
    name: string;
    description: string;
    extraMetadata: string; //json
    sourceTypeId: 1 | 2 | 3; //types allowed
}
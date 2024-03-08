export interface SourceModel {
    id: number;
    name: string;
    description: string;
    extraMetadata: string | null; //json
    sourceTypeId: SourceTypeEnum | null; //types allowed
}

export enum SourceTypeEnum {

    //Represents data entry through entry forms
    FORM = 1,

    // Denotes data that has been imported from external files
    IMPORT = 2,

    // Indicates Machine to Machine (M2M) communication as the data source
    DIGITAL = 3,
}
 export enum BufrTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'daycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
}

export interface BufrExportParametersModel { 
    bufrType: BufrTypeEnum;
 
    elementMappings: BufrElementMapDto[];
}

export interface BufrElementMapDto {
    databaseElementId: number;

    bufrConverterId: number;
}
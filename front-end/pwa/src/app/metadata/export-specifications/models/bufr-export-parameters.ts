 export enum BufrTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'wisdaycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
}

export interface BufrExportParametersModel { 
    bufrType: BufrTypeEnum;
 
    elements: BufrElementMapDto[];
}

export interface BufrElementMapDto {
    databaseElementId: number;

    bufrConverterId: number;
}
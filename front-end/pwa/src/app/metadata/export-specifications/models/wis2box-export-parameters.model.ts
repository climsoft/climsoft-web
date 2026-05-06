export enum ReportTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'daycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
    METAR = 'metar',
}

export interface Wis2BoxExportParametersModel {
    reportType: ReportTypeEnum;
    elementMappings: Wis2BoxElementMapDto[];
}

export interface Wis2BoxElementMapDto {
    databaseElementId: number;
    wis2BoxElement: string;
}

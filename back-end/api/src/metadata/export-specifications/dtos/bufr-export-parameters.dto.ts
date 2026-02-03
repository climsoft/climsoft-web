import { IsEnum, IsInt, Min, ValidateNested } from "class-validator";

export enum BufrTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'wisdaycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
}

export class BufrExportParametersDto {
    @IsEnum(BufrTypeEnum, { message: 'bufr type must be a valid value' })
    bufrType: BufrTypeEnum;

    @ValidateNested()
    elements: BufrElementMapDto[];
}

export class BufrElementMapDto {
    @IsInt()
    @Min(1)
    databaseElementId: number;

    @IsInt()
    @Min(1)
    bufrConverterId: number;
}
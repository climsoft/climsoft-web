import { IsEnum, IsInt, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum BufrTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'daycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
}

export class BufrExportParametersDto {
    @IsEnum(BufrTypeEnum, { message: 'bufr type must be a valid value' })
    bufrType: BufrTypeEnum;

    @Type(() => BufrElementMapDto)
    @ValidateNested({ each: true })
    elementMappings: BufrElementMapDto[];
}

export class BufrElementMapDto {
    @IsInt()
    @Min(1)
    databaseElementId: number;

    @IsInt()
    @Min(1)
    bufrConverterId: number;
}
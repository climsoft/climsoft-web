import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsDateString, IsInt, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class DataFlowQueryDto {
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsString({ each: true })
    stationIds: string[];

    @IsInt()
    elementId: number;

    @IsInt()
    level: number;

    @IsInt()
    interval: number;

    @IsDateString()
    fromDate: string;

    @IsDateString()
    toDate: string;
}
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class StationStatusQueryDto {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @IsInt()
    elementId?: number;

    @IsInt()
    duration: number;

    @IsString()
    durationType: 'hours' | 'days';
}


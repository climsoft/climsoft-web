import { Transform } from "class-transformer";
import { IsDateString, IsInt,  IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class DataAvailabilityDetailQueryDto {
    @IsString()
    stationId: string;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    @IsInt()
    interval: number;

    @IsDateString()
    fromDate: string;

    @IsDateString()
    toDate: string; // 2025-01-01 
}
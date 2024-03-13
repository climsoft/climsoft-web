import { Transform } from "class-transformer";
import { IsDateString, IsInt, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class CreateObservationQueryDto {
    @IsString()
    stationId: string;

    @IsInt()
    sourceId: number;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    @IsInt()
    period: number;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsDateString({}, { each: true })
    datetimes: string[];
}
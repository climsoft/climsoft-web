import { Transform } from "class-transformer";
import { IsDateString, IsInt, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class EntryFormObservationQueryDto {
    @IsString()
    stationId: string;

    @IsInt()
    sourceId: number;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    @IsInt()
    elevation: number;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsDateString({}, { each: true })
    datetimes: string[];
}
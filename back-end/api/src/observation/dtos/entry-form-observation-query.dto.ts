import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsDateString, IsInt, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class EntryFormObservationQueryDto {
    @IsString()
    stationId: string;

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsInt({ each: true })
    elementIds: number[];

    @IsInt()
    interval: number;

    @IsInt()
    sourceId: number;

    @IsInt()
    level: number;

    @IsDateString()
    fromDate: string;

    @IsDateString()
    toDate: string;
}
import { Transform, Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ViewObservationQueryDTO {

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()
    interval?: number;

    @IsOptional()
    @IsInt()
    level?: number;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    sourceIds?: number[];

    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    useEntryDate?: boolean;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsString()
    toDate?: string;

    // Added  @IsOptional because Query parameters are strings and NestJS whitelist doesn't work with string booleans well.
    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    deleted: boolean; // Note. These is not an optional property

    @IsOptional()
    @IsInt()
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()
    pageSize?: number;

}
import { Transform, Type } from "class-transformer";
import { ArrayNotEmpty, IsDateString, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";
import { QCStatusEnum } from "../enums/qc-status.enum";

export class ViewObservationQueryDTO {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsInt({ each: true })
    intervals?: number[];

    @IsOptional()
    @IsInt()
    level?: number;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @ArrayNotEmpty()
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
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsEnum(QCStatusEnum, { message: 'Qc status must be a valid QCStatusEnum value or undefined' })
    qcStatus?: QCStatusEnum;

    // Added  @IsOptional because Query parameters are strings and NestJS whitelist doesn't work with string booleans well.
    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    deleted?: boolean;

    @IsOptional()
    @IsInt()
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()
    pageSize?: number;
}
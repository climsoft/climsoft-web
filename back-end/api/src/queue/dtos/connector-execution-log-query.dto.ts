import { Transform, Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ConnectorExecutionLogQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    connectorId?: number;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

     // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    hasErrors?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    pageSize?: number;
}

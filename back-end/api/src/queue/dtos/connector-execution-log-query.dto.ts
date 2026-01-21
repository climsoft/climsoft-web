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

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => value !== undefined ? StringUtils.mapBooleanStringToBoolean(value.toString()) : undefined)
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

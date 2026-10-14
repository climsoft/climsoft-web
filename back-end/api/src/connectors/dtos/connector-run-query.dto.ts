import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";
import { ConnectorRunStatusEnum } from "../entities/connector-run.entity";

export class ConnectorRunQueryDto {
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
    @IsEnum(ConnectorRunStatusEnum)
    status?: ConnectorRunStatusEnum;

    /**
     * Hide runs that never reached the server. A connector failing on a short
     * cron writes one of those per tick, so the list defaults to showing every
     * run and this is how a sysadmin narrows it to runs that did something.
     */
    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    discoveredOnly?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    pageSize?: number;
}

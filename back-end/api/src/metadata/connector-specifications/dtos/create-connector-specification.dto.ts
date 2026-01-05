import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';
import { ConnectorTypeEnum } from '../enums/connector-type.enum';
import { ProtocolEnum } from '../enums/protocol.enum';

export class CreateConnectorSpecificationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(ConnectorTypeEnum, { message: 'Connector type must be either import or export' })
    connectorType: ConnectorTypeEnum;

    @IsString()
    serverIPAddress: string;

    @IsEnum(ProtocolEnum, { message: 'Protocol must be a valid value' })
    protocol: ProtocolEnum;

    @IsInt()
    @Min(1)
    @Max(65535)
    port: number;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsInt()
    @Min(1)
    timeout: number; // in seconds

    @IsInt()
    @Min(0)
    retries: number;

    @IsString()
    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    @IsOptional()
    @IsString()
    timezone?: string; // IANA timezone (e.g., 'Africa/Nairobi', 'UTC')

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsArray()
    @IsInt({ each: true })
    specificationIds: number[]; // Array of source_specification or export_specification IDs

    @IsOptional()
    extraMetadata?: any;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    @IsBoolean()
    disabled?: boolean;

    @IsOptional()
    @IsString()
    comment?: string;
}

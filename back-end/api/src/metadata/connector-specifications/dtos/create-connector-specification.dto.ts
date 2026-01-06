import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';
import { ConnectorTypeEnum } from '../enums/connector-type.enum';
import { ConnectorProtocolEnum } from '../enums/connector-protocol.enum';

export type ConnectorParameters = FTPMetadataDto; // TODO. In future add other connector metadata types | HTTPMetadata ;

export class CreateConnectorSpecificationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(ConnectorTypeEnum, { message: 'Connector type must be either import or export' })
    connectorType: ConnectorTypeEnum;

    @IsEnum(ConnectorProtocolEnum, { message: 'Protocol must be a valid value' })
    protocol: ConnectorProtocolEnum;

    @IsInt()
    @Min(1)
    timeout: number; // in seconds

    @IsInt()
    @Min(0)
    maximumRetries: number;

    @IsString()
    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    @ValidateNested()
    @Type(() => FTPMetadataDto)
    parameters: ConnectorParameters;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    @IsBoolean()
    disabled?: boolean;

    @IsOptional()
    @IsString()
    comment?: string;
}

export class FTPMetadataDto {
    @IsString()
    serverIPAddress: string;

    @IsInt()
    @Min(1)
    @Max(65535)
    port: number;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsString()
    remotePath: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FTPSpecificationDto)
    specifications: FTPSpecificationDto[];
}

export class FTPSpecificationDto {
    @IsString()
    filePattern: string; // Will be used to check both single files and multiple files

    @IsInt()
    specificationId: number;

    @IsOptional()
    stationId?: string; // Used by import only

}

// export class HTTPMetadata {
//     @IsString()
//     url: string;

//     @IsOptional()
//     @IsString()
//     token?: string;

//     specifications: {
//         specificationId: number;
//         stationId?: string;
//     };
// }




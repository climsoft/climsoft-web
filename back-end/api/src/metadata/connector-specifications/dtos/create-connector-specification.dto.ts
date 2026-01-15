import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';


export enum ConnectorTypeEnum {
    IMPORT = 'import',
    EXPORT = 'export'
}

export enum EndPointTypeEnum {
    FILE_SERVER = 'file_server',
    WEB_SERVER = 'web_server',
    // MQTT_BROKER = 'mqtt_broker',
    // We can have other custom end points here like; wis2box, adcon_database, climsoft_web_server etc.
}

export enum FileServerProtocolEnum {
    SFTP = 'sftp',
    FTP = 'ftp',
    FTPS = 'ftps',
}

export enum WebServerProtocolEnum {
    HTTP = 'http',
    HTTPS = 'https',
}

export type ConnectorParameters = FileServerParametersDto; // TODO. In future add other connector metadata types | HTTPMetadata ;

export class CreateConnectorSpecificationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(ConnectorTypeEnum, { message: 'Connector type must be either import or export' })
    connectorType: ConnectorTypeEnum;

    @IsEnum(EndPointTypeEnum, { message: 'End point type must be a valid value' })
    endPointType: EndPointTypeEnum;

    @IsString()
    @IsNotEmpty()
    hostName: string;

    @IsInt()
    @Min(1)
    timeout: number; // in seconds

    @IsInt()
    @Min(0)
    maximumRetries: number;

    @IsString()
    @IsNotEmpty()
    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    @IsOptional()
    @IsInt()
    @Min(1)
    orderNumber?: number; // Auto-generated if not provided

    @ValidateNested()
    @Type(() => FileServerParametersDto)
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

export class FileServerParametersDto {
    @IsEnum(FileServerProtocolEnum, { message: 'File server protocol must be a valid value' })
    protocol: FileServerProtocolEnum;

    @IsInt()
    @Min(1)
    @Max(65535)
    port: number;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    remotePath: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FileServerSpecificationDto)
    specifications: FileServerSpecificationDto[];
}

export class FileServerSpecificationDto {
    @IsString()
    filePattern: string; // Will be used to check both single files and multiple files

    @IsInt()
    @Min(1)
    specificationId: number; // source or export specification id

    @IsOptional()
    @IsString()
    stationId?: string; // Used by import only
}

export class WebServerMetadataDto {
    @IsEnum(WebServerProtocolEnum, { message: 'Web server protocol must be a valid value' })
    protocol: WebServerProtocolEnum;

    @IsOptional()
    @IsString()
    token?: string;

    specifications: {
        specificationId: number;
        stationId?: string;
    };
}
import { BadRequestException } from '@nestjs/common';
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

export type ConnectorParameters = ImportFileServerParametersDto | ExportFileServerParametersDto;

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
    @Type((options) => {
        // The 'options.object' gives access to the parent DTO,
        // allowing us to dynamically select the correct validation class
        // for the 'parameters' property based on the 'sourceType'.

        const object = options?.object;
        if (!object?.connectorType) {
            throw new BadRequestException('Connector type is required for determining parameters type');
        }

        const { connectorType } = object as CreateConnectorSpecificationDto;

        switch (connectorType) {
            case ConnectorTypeEnum.IMPORT:
                return ImportFileServerParametersDto;
            case ConnectorTypeEnum.EXPORT:
                return ExportFileServerParametersDto;
            default:
                throw new BadRequestException('Connector type is not recognised');
        }
    })
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

export class ImportFileServerParametersDto {
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
    remotePath: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    @IsBoolean()
    recursive?: boolean; // When true, files in subdirectories will be included

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportFileServerSpecificationDto)
    specifications: ImportFileServerSpecificationDto[];
}

export class ImportFileServerSpecificationDto {
    @IsString()
    filePattern: string; // Will be used to check both single files and multiple files

    @IsInt()
    @Min(1)
    specificationId: number; // import source specification id

    @IsOptional()
    @IsString()
    stationId?: string; // Used by import only
}

export class ExportFileServerParametersDto {
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
    remotePath: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExportFileServerSpecificationDto)
    specifications: ExportFileServerSpecificationDto[];
}

export class ExportFileServerSpecificationDto {

    @IsInt()
    @Min(1)
    specificationId: number; // export specification id

    @IsInt()
    @Min(1)
    duration: number;

    // TODO. Implement validation
    durationType: 'days' | 'hours'; // used by observation-export service to determine observation period to query

    @IsString()
    filePattern: 'yyyymmddhhmmss'; // used to name the created csv file
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
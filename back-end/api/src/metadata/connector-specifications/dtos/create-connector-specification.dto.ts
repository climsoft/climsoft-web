import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { DefaultNull } from 'src/shared/decorators/default-null.decorator';
import { IsCron } from 'src/shared/validators/is-cron.validator';


export enum ConnectorTypeEnum {
    IMPORT = 'import',
    EXPORT = 'export'
}

export enum ServerTypeEnum {
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

/**
 * Which timestamp to compare a row's "recency" against when picking up
 * observations for an auto-export run:
 *  - OBSERVATION: when the reading was taken (date_time)
 *  - ENTRY:       when the reading was recorded in the system (entry_date_time)
 */
export enum ObservationWindowDateFieldEnum {
    OBSERVATION = 'observation',
    ENTRY = 'entry',
}

export type ConnectorParameters = ImportFileServerParametersDto | ExportFileServerParametersDto;

export class CreateConnectorSpecificationDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsEnum(ConnectorTypeEnum, { message: 'Connector type must be either import or export' })
    connectorType!: ConnectorTypeEnum;

    @IsEnum(ServerTypeEnum, { message: 'Server type must be a valid value' })
    serverType!: ServerTypeEnum;

    @IsString()
    @IsNotEmpty()
    hostName!: string;

    @IsInt()
    @Min(1)
    timeout!: number; // in seconds

    @IsInt()
    @Min(0)
    retryAttempts!: number;

    @IsString()
    @IsNotEmpty()
    @IsCron()
    cronSchedule!: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

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
    @ValidateNested()
    parameters!: ConnectorParameters;


    @IsBoolean()
    disabled!: boolean;

    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    comment!: string | null;
}

export class FileServerParametersDto {
    @IsEnum(FileServerProtocolEnum, { message: 'File server protocol must be a valid value' })
    protocol!: FileServerProtocolEnum;

    @IsInt()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    remotePath!: string;
}

export class ImportFileServerParametersDto extends FileServerParametersDto {
    @IsBoolean()
    recursive!: boolean; // When true, files in subdirectories will be included

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportFileServerSpecificationDto)
    specifications!: ImportFileServerSpecificationDto[];
}

/**
 * Defines the rolling time window each scheduled export run pulls
 * observations from. `durationMinutes` is the look-back length;
 * `dateField` chooses which row timestamp the window applies to.
 */
export class ObservationWindowDto {
    @IsInt()
    @Min(1)
    durationMinutes!: number;

    @IsEnum(ObservationWindowDateFieldEnum, { message: 'Date field must be either observation or entry' })
    dateField!: ObservationWindowDateFieldEnum;
}

export class ExportFileServerParametersDto extends FileServerParametersDto {
    @Type(() => ObservationWindowDto)
    @ValidateNested()
    observationWindow!: ObservationWindowDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExportFileServerSpecificationDto)
    specifications!: ExportFileServerSpecificationDto[];
}

export class ImportFileServerSpecificationDto {
    @IsString()
    filePattern!: string; // Will be used to check both single files and multiple files

    @IsInt()
    @Min(1)
    specificationId!: number; // import source specification id

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    stationId!: string | null; // Used by import only
}

export class ExportFileServerSpecificationDto {

    //@IsString() // TODO. This could be needed in future
    //filePattern!: 'yyyymmddhhmmss'; // used to name the created csv file

    @IsInt()
    @Min(1)
    specificationId!: number; // export specification id

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    stationId!: string | null;
}

export class WebServerMetadataDto {
    @IsEnum(WebServerProtocolEnum, { message: 'Web server protocol must be a valid value' })
    protocol!: WebServerProtocolEnum;

    @IsOptional()
    @IsString()
    token?: string;

    specifications!: {
        specificationId: number;
        stationId?: string;
    };
}
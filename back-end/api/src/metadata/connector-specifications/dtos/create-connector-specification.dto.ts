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

/**
 * What `connector_specifications.parameters` actually holds in the database:
 * the connection settings, WITHOUT the bindings list.
 *
 * The bindings moved to `connector_specification_bindings` so that each one has
 * an id the run tiers can key on — see ConnectorSpecificationBindingEntity.
 * They are still carried in and out through `parameters.specifications` on the
 * API, because one connector is authored as one form; the service splits them
 * on the way in and rejoins them on the way out. Only the column's type
 * narrows.
 */
export type StoredConnectorParameters =
    | Omit<ImportFileServerParametersDto, 'specifications'>
    | Omit<ExportFileServerParametersDto, 'specifications'>;

/**
 * Payload for the dedicated enable/disable endpoint
 * (`PATCH /connector-specifications/:id/disabled`). Keeps the toggle action
 * separate from a full update so the controller doesn't have to re-validate
 * unrelated fields and so the scheduler can react with toggle-specific
 * behaviour (e.g. immediate enqueue on enable).
 */
export class ToggleConnectorDisabledDto {
    @IsBoolean()
    disabled!: boolean;
}

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
    // Recursion is expressed per-spec in `filePattern` (a `**` segment), not by
    // a connector-wide flag — see connector-file-pattern.util.ts.
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
    /**
     * The binding's id, echoed back by the client so an edit keeps its identity.
     *
     * Absent (or 0) means "a new binding" and gets a fresh row. Present means
     * "this existing binding, changed", and the row is updated in place — which
     * is what keeps its run history and its de-duplication ledger attached to
     * it across a pattern or station edit. A client that dropped this field
     * would silently turn every save into delete-and-recreate, and the next run
     * would re-import the whole file server.
     */
    @IsOptional()
    @IsInt()
    @Min(1)
    id?: number;

    /**
     * Skip this binding entirely on every run, leaving the connector's other
     * bindings working. Absent means enabled.
     */
    @IsOptional()
    @IsBoolean()
    disabled?: boolean;

    @IsString()
    filePattern!: string; // Will be used to check both single files and multiple files

    /**
     * File-name globs to drop from what `filePattern` matches. Absent or empty
     * (the usual case) excludes nothing; blank entries are ignored. See
     * `parseExcludePatterns` in connector-file-pattern.util.ts.
     */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    excludePatterns?: string[];

    @IsInt()
    @Min(1)
    specificationId!: number; // import source specification id

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    stationId!: string | null; // Used by import only
}

export class ExportFileServerSpecificationDto {
    /** See ImportFileServerSpecificationDto.id. */
    @IsOptional()
    @IsInt()
    @Min(1)
    id?: number;

    /** See ImportFileServerSpecificationDto.disabled. */
    @IsOptional()
    @IsBoolean()
    disabled?: boolean;

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
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { QCStatusEnum } from "src/observation/enums/qc-status.enum";
import { StringUtils } from "src/shared/utils/string.utils";

export class ObservationPeriodPermissionsDto {
    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    useEntryDate?: boolean;

    @IsOptional()
    within?: {
        fromDate: string;
        toDate: string;
    };

    @IsOptional()
    fromDate?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    last?: number; // In minutes
}

export class ExportPermissionsDto {
    @IsOptional()
    stationIds?: string[];

    @IsOptional()
    elementIds?: number[];

    @IsOptional()
    intervals?: number[];

    @IsOptional()
    observationPeriod?: ObservationPeriodPermissionsDto;

    @IsOptional()
    qcStatuses?: QCStatusEnum[];

    @IsOptional()
    exportTemplateIds?: number[];
}

// TODO. validate this class
export class UserPermissionDto {
    @IsOptional()
    stationsMetadataPermissions?: {
        stationIds?: string[];
    };

    @IsOptional()
    entryPermissions?: {
        stationIds?: string[];
        observationPeriod?: ObservationPeriodPermissionsDto
    };

    @IsOptional()
    importPermissions?: {
        importTemplateIds?: number[];
    };

    @IsOptional()
    qcPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    @IsOptional()
    ingestionMonitoringPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    @IsOptional()
    exportPermissions?: ExportPermissionsDto;
}


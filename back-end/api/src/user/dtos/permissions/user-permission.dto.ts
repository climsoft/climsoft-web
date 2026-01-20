import { IsInt, IsOptional, Min } from "class-validator";
import { QCStatusEnum } from "src/observation/enums/qc-status.enum";

export class ObservationPeriodPermissionsDto {
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


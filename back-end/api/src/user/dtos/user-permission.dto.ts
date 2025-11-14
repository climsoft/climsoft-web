import { IsOptional } from "class-validator";
import { QCStatusEnum } from "src/observation/enums/qc-status.enum";

export class ExportTemplatePermissionsDto {
    @IsOptional()
    stationIds?: string[];

    @IsOptional()
    elementIds?: number[];

    @IsOptional()
    intervals?: number[];

    @IsOptional()
    observationDate?: {
        last?: {
            duration: number,
            durationType: 'days' | 'hours' | 'minutes',
        };
        fromDate?: string;
        within?: {
            fromDate: string;
            toDate: string;
        };
    };

    @IsOptional()
    qcStatus?: QCStatusEnum;

    @IsOptional()
    exportTemplateIds?: number[];
}

// TODO. validate this class
export class UserPermissionDto {
    @IsOptional()
    stationsMetadataPermissions?: {
        stationIds?: string[];
        // TODO. Include ability to to assign forms, elements, instruments, etc
    };

    @IsOptional()
    entryPermissions?: {
        stationIds?: string[];
        importPermissions?: {
            importTemplateIds?: number[];
        };
        // TODO. Include observation date range in future.
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
    exportPermissions?: ExportTemplatePermissionsDto;
}


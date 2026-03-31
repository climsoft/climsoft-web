import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { BulkObservationFilterDto } from './bulk-observation-filter.dto';

export class BulkRestoreCheckDto {
    @ValidateNested()
    @Type(() => BulkObservationFilterDto)
    filter: BulkObservationFilterDto;
}

export class BulkRestoreExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export interface BulkRestoreCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkRestoreExecuteResponse {
    restoredCount: number;
}

import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { BulkObservationFilterDto } from './bulk-observation-filter.dto';

export class BulkDeleteCheckDto {
    @ValidateNested()
    @Type(() => BulkObservationFilterDto)
    filter: BulkObservationFilterDto;
}

export class BulkDeleteExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export interface BulkDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkDeleteExecuteResponse {
    deletedCount: number;
}

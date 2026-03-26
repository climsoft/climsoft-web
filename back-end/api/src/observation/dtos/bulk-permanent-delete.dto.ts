import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { BulkObservationFilterDto } from './bulk-observation-filter.dto';

export class BulkPermanentDeleteCheckDto {
    @ValidateNested()
    @Type(() => BulkObservationFilterDto)
    filter: BulkObservationFilterDto;
}

export class BulkPermanentDeleteExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export interface BulkPermanentDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkPermanentDeleteExecuteResponse {
    deletedCount: number;
}

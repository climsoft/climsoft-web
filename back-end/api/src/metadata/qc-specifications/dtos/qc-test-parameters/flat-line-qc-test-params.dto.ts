import { IsInt, IsNumber, IsOptional, ValidateNested, Min, } from 'class-validator';
import { Type } from 'class-transformer';

class ExcludeRangeDto {
    @IsNumber()
    lowerThreshold: number;

    @IsNumber()
    upperThreshold: number;
}

export class FlatLineQCTestParamsDto {
    @IsInt()
    @Min(2, { message: 'consecutiveRecords must be at least 2' })
    consecutiveRecords: number;

    @IsNumber()
    flatLineThreshold: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExcludeRangeDto)
    excludeRange?: ExcludeRangeDto;
}

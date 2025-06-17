import {
    IsInt,
    IsNumber,
    IsOptional,
    ValidateNested,
    Min, 
} from 'class-validator';
import { Type } from 'class-transformer';
import { QCTestParametersValidity } from '../create-element-qc-test.dto';

class ExcludeRangeDto {   
    @IsNumber()
    lowerThreshold: number;

    @IsNumber()
    upperThreshold: number;
}

export class FlatLineQCTestParametersDto implements QCTestParametersValidity {
    @IsInt()
    @Min(2, { message: 'consecutiveRecords must be at least 2' })
    consecutiveRecords: number;

    @IsNumber()
    flatLineThreshold: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExcludeRangeDto)
    excludeRange?: ExcludeRangeDto;

    isValid(): boolean {
        // Optional runtime checks if needed
        if (this.excludeRange) {
            return (
                typeof this.excludeRange.lowerThreshold === 'number' &&
                typeof this.excludeRange.upperThreshold === 'number' &&
                this.excludeRange.lowerThreshold <= this.excludeRange.upperThreshold
            );
        }
        return true;
    }
}

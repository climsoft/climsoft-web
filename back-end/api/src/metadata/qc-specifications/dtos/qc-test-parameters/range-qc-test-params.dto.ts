import { ArrayNotEmpty, IsArray, IsDefined, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AllRangeThresholdModel {
    @IsNumber()
    lowerThreshold: number;

    @IsNumber()
    upperThreshold: number;
}

class MonthlyRangeThresholdModel {
    @IsInt()
    @Min(1, { message: 'month must be within the range of 1 to 12' })
    @Max(12, { message: 'month must be within the range of 1 to 12' })
    monthId: number;

    @IsNumber()
    lowerThreshold: number;

    @IsNumber()
    upperThreshold: number;
}

export class RangeThresholdQCTestParamsDto {
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    stationIds?: string[];

    // ---- ALL MONTHS ----
    // Must exist if monthsThresholds doesn't.
    @ValidateIf(o => o.monthsThresholds === undefined)
    @IsDefined({ message: 'Either allMonthsThreshold or monthsThresholds must be present.' })
    @ValidateNested()
    @Type(() => AllRangeThresholdModel)
    allRangeThreshold?: AllRangeThresholdModel;

    // ---- MONTHS ARRAY ----
    // Must exist if allRangeThreshold doesn't.
    @ValidateIf(o => o.allRangeThreshold === undefined)
    @IsDefined({ message: 'Either allMonthsThreshold or monthsThresholds must be present.' })
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => MonthlyRangeThresholdModel)
    monthsThresholds?: MonthlyRangeThresholdModel[];
}

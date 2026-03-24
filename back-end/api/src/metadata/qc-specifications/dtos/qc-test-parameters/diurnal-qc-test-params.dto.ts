import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Diurnal QC Test — Monotonic Trend Check
 *
 * Validates that observations follow the expected daily (diurnal) cycle for the element.
 * The day is divided into user-defined periods, each with an expected trend direction.
 * For each observation, the test compares it against the immediately preceding value
 * and checks whether the direction of change matches the expected trend for that hour.
 *
 * Example — Temperature diurnal cycle:
 *   periods: [
 *     { trend: "rising",  startHour: 6,  endHour: 14, tolerance: 0.5 },
 *     { trend: "falling", startHour: 18, endHour: 5,  tolerance: 0.5 }
 *   ]
 *
 *   Observation at 10:00 (within "rising" period 6h–14h):
 *     Previous value: 22.0°C, Current value: 20.0°C → change = -2.0
 *     Expected "rising" but value dropped by 2.0 (exceeds tolerance of 0.5) → FAIL
 *
 *   Observation at 20:00 (within "falling" period 18h–5h):
 *     Previous value: 28.0°C, Current value: 26.5°C → change = -1.5
 *     Expected "falling" and value dropped → PASS
 *
 * Hours not covered by any period are skipped (test not applicable).
 * Periods support wrap-around: startHour: 18, endHour: 5 covers 18..23 and 0..5.
 */
class DiurnalPeriodDto {
    /** The expected direction of change: 'rising' (values should increase) or 'falling' (values should decrease) */
    @IsIn(['rising', 'falling'], { message: 'trend must be rising or falling' })
    trend: 'rising' | 'falling';

    /** Start hour of this period (0-23, inclusive). Supports wrap-around when startHour > endHour. */
    @IsInt()
    @Min(0)
    @Max(23)
    startHour: number;

    /** End hour of this period (0-23, inclusive). */
    @IsInt()
    @Min(0)
    @Max(23)
    endHour: number;

    /**
     * Allowed counter-trend deviation before flagging.
     * For a "rising" period: a drop of up to `tolerance` is acceptable (value_change >= -tolerance).
     * For a "falling" period: a rise of up to `tolerance` is acceptable (value_change <= tolerance).
     * Set to 0 for strict monotonic checking.
     */
    @IsNumber()
    @Min(0)
    tolerance: number;
}

export class DiurnalQCTestParamsDto {
    /** One or more time-of-day periods with expected trend directions */
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => DiurnalPeriodDto)
    periods: DiurnalPeriodDto[];
}

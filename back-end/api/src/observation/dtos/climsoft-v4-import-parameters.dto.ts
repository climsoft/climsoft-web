import { Transform, Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ElementIntervalDto {
    @IsInt()
    elementId: number;

    @IsInt()
    interval: number;
}

export class ClimsoftV4ImportParametersDto {
    @IsDateString()
    fromEntryDate: string;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds?: string[];

    @ValidateNested({ each: true })
    @Type(() => ElementIntervalDto)
    elements: ElementIntervalDto[];

    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    includeClimsoftWebData: boolean;

    @IsInt()
    pollingInterval: number; // In minutes

    isValid(): boolean {
        return true;
    }

}


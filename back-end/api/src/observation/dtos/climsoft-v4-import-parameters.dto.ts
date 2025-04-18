import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ClimsoftV4ImportParametersDto {
    @IsString()
    fromEntryDate: string;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ElementIntervalModel)
    elements: ElementIntervalModel[];

    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    includeClimsoftWebData: boolean;

    isValid(): boolean {
        return true;
    }

}

export class ElementIntervalModel {
    @IsInt()
    elementId: number;

    @IsInt()
    interval: number;
}
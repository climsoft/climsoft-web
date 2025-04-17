import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ClimsoftV4ImportParametersDto {
    @IsString()
    fromEntryDate: string;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds?: string[];

    //@ValidateNested()
    //@Type(function () { return this._type(); }) 
    @IsOptional() // TODO. Temporary until we implement validate nested
    elements: ElementIntervalModel[];

    isValid(): boolean {
        return true;
    }

}

export interface ElementIntervalModel {
    elementId: number;
    interval: number;
}
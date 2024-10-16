import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils"; 
import { StationObsProcessingMethodEnum } from "../enums/station-obs-processing-method.enum";

export class ViewStationQueryDTO {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsString({each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsEnum(StationObsProcessingMethodEnum, { each: true , message: 'observation processing method must be a valid StationObsProcessingMethodEnum value or undefined' })
    obsProcessingMethods?: StationObsProcessingMethodEnum[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({each: true })
    obsEnvironmentIds?: number[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({each: true })
    obsFocusIds?: number[];

    @IsOptional()
    @IsInt()
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()   
    pageSize?: number;
}
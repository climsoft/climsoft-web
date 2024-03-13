import { Transform } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ViewObservationQueryDTO {
   
    @IsOptional()
    @IsString()
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt()
    sourceIds?: number[]; 

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()   
    period?: number;

    @IsOptional()
    @IsDateString()   
    fromDate?: string; 

    @IsOptional()
    @IsString()  
    toDate?: string;

    @IsOptional()
    @IsInt()
    page?: number;

    @IsOptional()
    @IsInt()   
    pageSize?: number;

}
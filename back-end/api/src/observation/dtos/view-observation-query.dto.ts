import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ViewObservationQueryDTO {
   
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt( {each: true })
    sourceIds?: number[]; 

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()   
    period?: number;

    @IsOptional()
    @IsBoolean()
    useEntryDate?: boolean;

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
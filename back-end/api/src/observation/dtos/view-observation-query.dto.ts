import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsDecimal, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ViewObservationQueryDTO {
   
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()   
    period?: number;

    @IsOptional()
    @IsDecimal()   
    elevation?: number;
    
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt( {each: true })
    sourceIds?: number[]; 

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
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()   
    pageSize?: number;

}
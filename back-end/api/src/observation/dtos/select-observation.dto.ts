import { Transform } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class SelectObservationDTO {
   
    @IsOptional()
    @IsString()
    stationId?: string;

    @IsOptional()
    @IsInt()
    sourceId?: number; 

    //@IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsNumber()   
    period?: number;

    @IsString()
    @IsOptional()
    fromDate?: string; //yyyy-mm-dd format

    @IsString()
    @IsOptional()
    toDate?: string;//yyyy-mm-dd format

    
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    hours?: number[];

    @IsOptional()
    @IsInt()
    page?: number;

    @IsNumber()
    @IsOptional()
    pageSize?: number;


    //TODO. Delete below later

    @IsOptional()
    @IsInt()
    year?: number;//todo. remove

 
    @IsOptional()
    @IsInt()
    month?: number;//todo. remove

    @IsOptional()
    @IsInt()
    day?: number;//todo. remove


 
}
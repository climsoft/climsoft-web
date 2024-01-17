import { IsNumber, IsOptional, IsString } from "class-validator";

export class SelectObservationDTO {
    @IsString()
    @IsOptional()
    stationId?: string;

    @IsNumber()
    @IsOptional()
    sourceId?: number; 

    @IsNumber()
    @IsOptional()
    elementIds?: number[];

    @IsNumber()
    @IsOptional()
    period?: number;

    @IsString()
    @IsOptional()
    fromDate?: string; //yyyy-mm-dd format

    @IsString()
    @IsOptional()
    toDate?: string;//yyyy-mm-dd format

    @IsNumber()
    @IsOptional()
    hours?: number[];

    @IsNumber()
    @IsOptional()
    page?: number;

    @IsNumber()
    @IsOptional()
    pageSize?: number;


    //TODO. Delete below later

    @IsNumber()
    @IsOptional()
    year?: number;//todo. remove

    @IsNumber()
    @IsOptional()
    month?: number;//todo. remove

    @IsNumber()
    @IsOptional()
    day?: number;//todo. remove


 
}
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
    year?: number;

    @IsNumber()
    @IsOptional()
    month?: number;

    @IsNumber()
    @IsOptional()
    day?: number;

    @IsNumber()
    @IsOptional()
    hours?: number[];

    @IsNumber()
    @IsOptional()
    period: number;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsNumber()
    @IsOptional()
    offset?: number;
}
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
    elementId?: number;

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
    hour?: number;

    @IsString()
    @IsOptional()
    period: string;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsNumber()
    @IsOptional()
    offset?: number;
}
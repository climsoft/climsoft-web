import { IsDateString, IsInt, IsNumber, IsString } from "class-validator"; 

export class ViewObservationLogQueryDto {
    @IsString()
    stationId: string;

    @IsInt()
    elementId: number;

    @IsInt()
    sourceId: number;

    @IsNumber()
    level: number;

    @IsDateString()
    datetime: string;

    @IsInt()
    interval: number;
 
}
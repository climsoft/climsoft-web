import { IsDateString, IsInt, IsNumber, IsString } from 'class-validator';

export class DeleteObservationDto {
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
    period: number;
}
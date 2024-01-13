import { IsDate, IsNumber, IsString } from 'class-validator';

export class CreateObservationDto {

    @IsString()
    stationId: string;

    @IsNumber()
    elementId: number;

    @IsNumber()
    sourceId: number;

    @IsString()
    level: string;

    @IsDate()
    datetime: string;

    @IsNumber()
    period: number;

    @IsNumber()
    value: number | null;

    @IsNumber()
    flag: number | null;

    @IsNumber()
    qcStatus: number;

    @IsString()
    comment: string | null;

}
import { IsDate, IsJSON, IsNumber, IsString } from 'class-validator';

export class ViewObservationDto {

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

    @IsString()
    period: string;

    @IsNumber()
    value: number | null;

    @IsString()
    flag: string | null;

    @IsNumber()
    qcStatus: number;

    @IsString()
    comment: string | null;

    @IsNumber()
    entryUser: number

    @IsDate()
    entryDateTime: Date;

    @IsJSON()
    log: string;

}
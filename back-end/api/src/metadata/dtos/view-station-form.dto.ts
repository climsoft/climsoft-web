import { IsDate, IsNumber, IsString } from 'class-validator';

export class ViewStationFormDto {

    @IsString()
    stationId: string;

    @IsNumber()
    sourceId: number;

    @IsString()
    sourceName: string;

    @IsString()
    sourceDescription: string;

    entryUserId: number | null;

    @IsDate()
    entryDateTime: string;
}
import { IsDate, IsJSON, IsNumber, IsString } from 'class-validator';

export class ViewStationFormDto {

    @IsString()
    stationId: string;

    @IsNumber()
    sourceId: number;

    @IsString()
    sourceName: string;

    @IsString()
    sourceDescription: string;

    @IsString()
    comment: string | null;
  
    @IsString()
    entryUser: string;

    @IsDate()
    entryDateTime: string;

    @IsJSON()
    log: string | null;

}
import { IsDate, IsNumber, IsString } from 'class-validator';

export class ViewStationElementDto {

    @IsString()
    stationId: string;

    @IsNumber()
    elementId: number;

    @IsString()
    elementName: string;

    @IsString()
    elementDescription: string;
  
    @IsString()
    entryUserId: string;

    @IsDate()
    entryDateTime: string;
}
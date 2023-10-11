import { IsNumber, IsString } from 'class-validator';

export class CreateStationFormDto {

    @IsString()
    stationId: string;

    @IsNumber()
    sourceId: number;

}
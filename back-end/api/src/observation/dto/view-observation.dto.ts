import { IsDate, IsNumber, IsString } from 'class-validator';

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
    datetime: Date;
   
    @IsString()
    period: string;

    @IsNumber()
    value: number;
  
    @IsString()
    flag: string;
  
    @IsNumber()
    qcStatus: number;

    @IsNumber()
    entryUser: number
  
    @IsDate()
    entryDateTime: Date;


}
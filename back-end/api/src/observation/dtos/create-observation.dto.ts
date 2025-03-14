import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { FlagEnum } from '../enums/flag.enum'; 

export class CreateObservationDto {
    @IsString()
    stationId: string;

    @IsInt()
    elementId: number;

    @IsInt()
    sourceId: number;

    @IsInt()
    level: number;

    @IsDateString()
    datetime: string;

    @IsInt()
    interval: number;

    @IsOptional() // TODO. Not sure if this correctly represents null.
    @IsNumber() // covers both integers and floats
    value: number | null;

    @IsOptional() // TODO. Not sure if this correctly represents null.
    @IsEnum(FlagEnum, { message: 'flag must be a valid FlagEnum value or null' })
    flag: FlagEnum | null;
 
    @IsOptional() // TODO. Not sure if this correctly represents null.
    @IsString()
    comment: string | null;

}
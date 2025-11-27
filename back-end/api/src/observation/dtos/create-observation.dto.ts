import { IsDateString, IsEnum, IsInt, IsNumber, IsString, ValidateIf } from 'class-validator';
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

    @ValidateIf(o => o.value !== null)
    @IsNumber() // covers both integers and floats
    value: number | null;

    @ValidateIf(o => o.flag !== null)
    @IsEnum(FlagEnum, { message: 'flag must be a valid FlagEnum value or null' })
    flag: FlagEnum | null;
 
    @ValidateIf(o => o.comment !== null)
    @IsString()
    comment: string | null;
}
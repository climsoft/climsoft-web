import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { FlagEnum } from '../enums/flag.enum';
import { QCStatusEnum } from '../enums/qc-status.enum';

export class CreateObservationDto {

    @IsString()
    stationId: string;

    @IsInt()
    elementId: number;

    @IsInt()
    sourceId: number;

    @IsNumber()
    elevation: number;

    @IsDateString()
    datetime: string;

    @IsInt()
    period: number;

    @IsOptional() 
    @IsNumber()
    value: number | null;

    @IsOptional()
    @IsEnum(FlagEnum, { message: 'flag must be a valid FlagEnum value or null' })
    flag: FlagEnum | null;
 
    @IsOptional()
    @IsString()
    comment: string | null;

}
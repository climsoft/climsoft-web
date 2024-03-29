import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StationStatusEnum } from '../enums/station-status.enum';
import { StationObservationMethodEnum } from '../enums/station-observation-method.enum';
import { PointDTO } from './point.dto';
import { Type } from 'class-transformer';

export class CreateUpdateStationDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;
 
    @ValidateNested()
    @Type(() => PointDTO)
    location: PointDTO; 

    @IsNumber()
    elevation: number; //from and to. Elevation of station above mean sea level.  todo. discuss on oscar and openCDMS

    @IsEnum(StationObservationMethodEnum, { message: 'Station observing method must be a valid value' })
    stationObsMethod: StationObservationMethodEnum;

    @IsOptional()
    @IsInt()
    stationObsEnvironmentId: number | null;

    @IsOptional()
    @IsInt()
    stationObsFocusId: number | null;

    @IsOptional()
    @IsString()
    wmoId: string | null;

    @IsOptional()
    @IsString()
    wigosId: string | null;

    @IsOptional()
    @IsString()
    icaoId: string | null;

    @IsOptional()
    @IsEnum(StationStatusEnum, { message: 'Station status must be a valid value' })
    status: StationStatusEnum | null;

    @IsOptional()
    @IsDateString()
    dateEstablished: string | null;

    @IsOptional()
    @IsDateString()
    dateClosed: string | null;

    @IsString()
    comment: string | null;

}


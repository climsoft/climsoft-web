import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { StationStatusEnum } from '../enums/station-status.enum';
import { StationObservationMethodEnum } from '../enums/station-observation-method.enum';

export class CreateStationDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    location: string | null; //TODO. a GeoJSON. Polygon feature
  
    @IsOptional()
    @IsNumber()
    elevation: number | null; //from and to. Elevation of station above mean sea level.  todo. discuss on oscar and openCDMS
  
    @IsOptional()
    @IsEnum(StationObservationMethodEnum, { message: 'Station observing method must be a valid value' })
    stationObservationMethod: StationObservationMethodEnum | null;
  
    @IsOptional()
    @IsInt()
    stationObsevationEnvironmentId: number | null;
  
    @IsOptional()
    @IsInt()
    stationObservationFocusId: number | null;

    @IsOptional()
    @IsEnum(StationStatusEnum, { message: 'Station status must be a valid value' })
    status: StationStatusEnum | null;
  
    @IsOptional()
    @IsDateString()
    dateEstablished: Date | null;
  
    @IsOptional()
    @IsDateString()
    dateClosed: string | null;

    @IsString()
    comment: string | null;

}


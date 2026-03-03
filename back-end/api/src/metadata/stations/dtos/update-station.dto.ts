import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { StationStatusEnum } from '../enums/station-status.enum';
import { StationObsProcessingMethodEnum } from '../enums/station-obs-processing-method.enum';

export class UpdateStationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    elevation?: number; // Elevation of station above mean sea level. 

    @IsOptional()
    @IsEnum(StationObsProcessingMethodEnum, { message: 'Station observing method must be a valid value' })
    stationObsProcessingMethod?: StationObsProcessingMethodEnum;

    @IsOptional()
    @IsInt()
    stationObsEnvironmentId?: number;

    @IsOptional()
    @IsInt()
    stationObsFocusId?: number;

    @IsOptional()
    @IsInt()
    ownerId?: number;

    @IsOptional()
    @IsInt()
    operatorId?: number;

    @IsOptional()
    @IsString() // TODO. Add validation for WMO station identifier
    wmoId?: string;

    @IsOptional()
    @IsString() // TODO. Add validation for WMO wigos station identifier
    wigosId?: string;

    @IsOptional()
    @IsString()
    icaoId?: string ;

    @IsOptional()
    @IsEnum(StationStatusEnum, { message: 'Station status must be a valid value' })
    status?: StationStatusEnum;

    @IsOptional()
    @IsDateString()
    dateEstablished?: string;

    @IsOptional()
    @IsDateString()
    dateClosed?: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StationStatusEnum } from '../enums/station-status.enum';
import { StationObsProcessingMethodEnum } from '../enums/station-obs-processing-method.enum';

import { Type } from 'class-transformer';
import { PointDTO } from 'src/shared/dtos/point.dto';

export class UpdateStationDto {

    @IsString()
    name: string;

    @IsString()
    description: string;
 
    @ValidateNested()
    @Type(() => PointDTO)
    location: PointDTO; 

    @IsNumber()
    elevation: number; //from and to. Elevation of station above mean sea level.  todo. discuss on oscar and openCDMS

    @IsEnum(StationObsProcessingMethodEnum, { message: 'Station observing method must be a valid value' })
    stationObsProcessingMethod: StationObsProcessingMethodEnum;

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


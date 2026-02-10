import { IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum BufrTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'daycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
}

export class BufrExportParametersDto {
    @IsEnum(BufrTypeEnum, { message: 'bufr type must be a valid value' })
    bufrType: BufrTypeEnum;

    @Type(() => BufrElementMapDto)
    @ValidateNested({ each: true })
    elementMappings: BufrElementMapDto[];
}

export class BufrElementMapDto {
    @IsInt()
    @Min(1)
    databaseElementId: number;

    @IsString()
    @IsNotEmpty()
    bufrElement: string;
}

export const DACLI_BUFR_ELEMENTS: string[] = [
    'precipitation',
    'fresh_snow_depth',
    'total_snow_depth',
    'maximum_temperature',
    'minimum_temperature',
    'average_temperature',
];

export const SYNOP_BUFR_ELEMENTS: string[] = [
    'air_temperature',
    'dew_point_temperature',
    'relative_humidity',
    'wind_speed',
    'wind_direction',
    'wind_gust_speed',
    'station_pressure',
    'sea_level_pressure',
    'precipitation',
    'snow_depth',
    'cloud_cover',
    'cloud_base_height',
    'visibility',
    'present_weather',
    'past_weather',
    'air_temperature_2m',
    'dew_point_temperature_2m',

];

export const CLIMAT_BUFR_ELEMENTS: string[] = [
    'temp_temperature',
    'temp_dew_point_temperature',
    'temp_relative_humidity',
];
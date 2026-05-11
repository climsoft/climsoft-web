import { IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum ReportTypeEnum {
    SYNOP = 'synop',
    DAYCLI = 'daycli',
    CLIMAT = 'climat',
    TEMP = 'temp',
    METAR = 'metar',
}

export class Wis2BoxExportParametersDto {
    @IsEnum(ReportTypeEnum, { message: 'report type must be a valid value' })
    reportType!: ReportTypeEnum;

    @Type(() => Wis2BoxElementMapDto)
    @ValidateNested({ each: true })
    elementMappings!: Wis2BoxElementMapDto[];
}

export class Wis2BoxElementMapDto {
    @IsInt()
    @Min(1)
    databaseElementId!: number;

    @IsString()
    @IsNotEmpty()
    wis2BoxElement!: string;
}

/**
 * Lists of WIS2BOX-recognised CSV column names per report type. The
 * frontend uses these to populate the element-mapping selector when the
 * user is configuring a WIS2BOX export.
 */
export const WIS2BOX_ELEMENTS_BY_REPORT_TYPE: Record<ReportTypeEnum, string[]> = {
    [ReportTypeEnum.SYNOP]: [
        'station_pressure',
        'msl_pressure',
        //'pressure_change_3hr', // Calculate it from the 1 hour station_pressure. It is a minus calculation between the value for the latest hour and the last 3 hour. If any misses then it should be missing as well.
        // 'pressure_tendency_characteristic', // 2 if it is increasing (pressure3hr is positive), 4 if it is the same (pressure3hr is 0), 7 if it has decreased for the last 3 hours(if pressure3hr is negative). If any pressure3hr is missing it should be missing
        // 'pressure_change_24hr', // Calculate it from the 1 hour station_pressure. It is a minus calculation between the value for the latest hour and the last 24 hour. If any misses then it should be missing as well.
        // 'pressure_standard_level', // Hard code as 85000
        'geopotential_height',
        // 'thermometer_height', //  Should come from station element instrument metadata.  
        'air_temperature', // convert from celcius to kelvin
        'dewpoint_temperature', // convert from celcius to kelvin
        'relative_humidity',
        // 'visibility_sensor_height', //  Should come from station element instrument metadata. 
        'horizontal_visibility',
        'cloud_total_cover',// convert from oktas to % . 0 to 8 - which adds to 100%.  9 or / is 113% . No decimal points that's why 112.5 becomes 113
        'cloud_total_vertical_sig',
        'cloud_amount_low_level',
        'cloud_base_height',  // convert feet to meters
        'cloud_type_low_level',
        'cloud_type_mid_level',
        'cloud_type_high_level',
        'cloud_layer1_vertical_sig',
        'cloud_layer1_amount',
        'cloud_layer1_type',
        'cloud_layer1_base_height', // convert feet to meters
        'cloud_layer2_vertical_sig',
        'cloud_layer2_amount',
        'cloud_layer2_type',
        'cloud_layer2_base_height',  // convert feet to meters
        'cloud_layer3_vertical_sig',
        'cloud_layer3_amount',
        'cloud_layer3_type',
        'cloud_layer3_base_height',  // convert feet to meters
        'cloud_layer4_vertical_sig',
        'cloud_layer4_amount',
        'cloud_layer4_type',
        'cloud_layer4_base_height',  // convert feet to meters
        // 'soil_level1_depth', // TODO. Should come from station element instrument metadata.
        // 'soil_level1_temperature', // TODO. Activate after depth is activated
        // 'soil_level2_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level2_temperature', // TODO. Activate after depth is activated
        // 'soil_level3_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level3_temperature', // TODO. Activate after depth is activated
        // 'soil_level4_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level4_temperature', // TODO. Activate after depth is activated
        // 'soil_level5_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level5_temperature', // TODO. Activate after depth is activated
        // 'soil_level6_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level6_temperature', // TODO. Activate after depth is activated
        // 'soil_level7_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level7_temperature', // TODO. Activate after depth is activated
        // 'soil_level8_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level8_temperature', // TODO. Activate after depth is activated
        // 'soil_level9_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level9_temperature', // TODO. Activate after depth is activated
        // 'soil_level10_depth',  // TODO. Should come from station element instrument metadata.
        // 'soil_level10_temperature', // TODO. Activate after depth is activated
        // 'method_of_ground_state_measurement', // Should come from station element instrument metadata.
        'ground_state',
        // 'method_of_snow_depth_measurement', // Should come from station element instrument metadata.
        'snow_depth',
        'ground_minimum_temperature',
        'present_weather',
        //  'past_weather_period', // Hard code as -1
        'past_weather1',
        'past_weather2',
        'sunshine_total_1hr', // measured in minutes
        // 'sunshine_total_24hr', //  Calculate it from the 1 hour sunshine total and divide by 60 minutes.
        // 'rain_sensor_height', //  Should come from station element instrument metadata.
        'total_precipitation_1_hour',
        // 'total_precipitation_3_hour', //  Calculate it from the 1 hour precipitation
        // 'total_precipitation_6_hour', //  Calculate it from the 1 hour precipitation
        // 'total_precipitation_12_hour', //  Calculate it from the 1 hour precipitation
        // 'total_precipitation_24_hour', //  Calculate it from the 1 hour precipitation
        // 'extreme_temp_sensor_height', //  Should come from station element instrument metadata
        // 'temp_max_period', // Hard coded as - 1
        'temp_maximum',
        // 'temp_min_period', // Hard codes as -1
        'temp_minimum',
        // 'anemometer_height', //  Should come from station element instrument metadata.
        // 'wind_instrument_type', // Should come from station element instrument metadata.
        'wind_direction',
        'wind_speed', // TODO. How to handle knots, km/h data and m/s AWS data
        'max_wind_gust_direction_10min', // TODO. How to handle knots, km/h data and m/s AWS data.
        'maximum_wind_gust_speed_10min', // TODO. How to handle knots data and m/s AWS data.
        'max_wind_gust_direction_60min', // TODO. How to handle knots data and m/s AWS data.
        'maximum_wind_gust_speed_60min', // TODO. How to handle knots data and m/s AWS data.
        // 'evaporation_sensor_height', // Should come from station element instrument metadata.
        'evaporation_time_period', // Hard coded as -1
        // 'evaporation_sensor_type', // Should come from station element instrument metadata. 
        'evaporation_total',
        // 'solar_radiation1_time_period', // Hard coded as -1
        'solar_radiation1_long_wave',
        'solar_radiation1_short_wave',
        'solar_radiation1_net',
        'solar_radiation1_global',
        'solar_radiation1_diffuse',
        'solar_radiation1_direct',
        // 'solar_radiation24_time_period',  Hard coded as -24
        // 'solar_radiation24_long_wave', //  Calculate it from the 1 hour solar_radiation1_long_wave
        // 'solar_radiation24_short_wave', //  Calculate it from the 1 hour solar_radiation1_short_wave
        // 'solar_radiation24_net', //  Calculate it from the 1 hour solar_radiation24_net
        // 'solar_radiation24_global', //  Calculate it from the 1 hour solar_radiation24_global
        // 'solar_radiation24_diffuse', //  Calculate it from the 1 hour solar_radiation24_diffuse
        // 'solar_radiation24_direct', //  Calculate it from the 1 hour solar_radiation24_direct
    ],
    [ReportTypeEnum.DAYCLI]: [
        'precipitation',
        'fresh_snow_depth',
        'total_snow_depth',
        // 'thermometer_height', // TODO. Should come from station element instrument metadata.
        'maximum_temperature',
        'minimum_temperature',
        'average_temperature',
    ],
    [ReportTypeEnum.CLIMAT]: [
        'mean_pressure',
        'mean_pressure_sea_level',
        'standard_pressure_level',
        'geopotential_height',
        // 'height_of_sensor', // TODO. Should come from station element instrument metadata. For now, it is hard coded.
        'air_temperature',
        // 'method_for_extreme_temperatures', // TODO. Will be hard coded
        'daily_read_time_max_temp',
        'max_temperature_last_24h',
        'daily_read_time_min_temp',
        'min_temperature_last_24h',
        'vapour_pressure',
        'daily_mean_temp_deviation',
        'days_missing_pressure',
        'days_missing_mean_temperature',
        'days_missing_vapour_pressure',
        'days_missing_max_temperature',
        'days_missing_min_temperature',
        'total_sunshine_hours',
        'total_sunshine_percent',
        'days_missing_total_sunshine',
        'wind_over_10mps_days',
        'wind_over_20mps_days',
        'wind_over_30mps_days',
        'max_temp_below_zero_days',
        'max_temp_above_25_days',
        'max_temp_above_30_days',
        'max_temp_above_35_days',
        'max_temp_above_40_days',
        'min_temp_below_zero_days',
        'snow_over_0cm_days',
        'snow_over_1cm_days',
        'snow_over_10cm_days',
        'snow_over_50cm_days',
        'horizontal_visibility_below_50m_days',
        'horizontal_visibility_below_100m_days',
        'horizontal_visibility_below_1000m_days',
        'hail_days',
        'storm_days',
        // 'height_of_temp_sensor', // TODO. Should come from station element instrument metadata. For now, it is hard coded.
        'highest_daily_mean_temperature_qualifier',
        'highest_daily_mean_temperature_day',
        'highest_daily_mean_temperature',
        'lowest_daily_mean_temperature_qualifier',
        'lowest_daily_mean_temperature_day',
        'lowest_daily_mean_temperature',
        'monthly_max_temperature_qualifier',
        'monthly_max_temperature_day',
        'monthly_max_temperature',
        'monthly_min_temperature_qualifier',
        'monthly_min_temperature_day',
        'monthly_min_temperature',
        // 'height_of_wind_sensor', // TODO. Should come from station element instrument metadata. For now, it is hard coded.
        // 'instrumentation_for_wind_measurement', // TODO. Should come from station element instrument metadata. For now, it is hard coded.
        'maximum_instantaneous_wind_speed_qualifier',
        'maximum_instantaneous_wind_speed_day',
        'maximum_instantaneous_wind_speed',
        // 'height_of_rain_sensor', // TODO. Should come from station element instrument metadata. For now, it is hard coded.
        'total_accumulated_precipitation',
        'frequency_group_precipitation',
        'days_with_precipitation_above_1mm',
        'total_missing_days_with_respect_to_accumulation_or_average_precipitation',
        'rain_above_1kgpsm_days',
        'rain_above_5kgpsm_days',
        'rain_above_10kgpsm_days',
        'rain_above_50kgpsm_days',
        'rain_above_100kgpsm_days',
        'rain_above_150kgpsm_days',
        'highest_daily_amount_of_precipitation_qualifier',
        'highest_daily_amount_of_precipitation_day',
        'highest_daily_amount_of_precipitation',
        'starting_reference_period_year',
        'ending_reference_period_year',
        'normal_mean_pressure',
        'normal_mean_pressure_sea_level',
        'normal_standard_pressure_level',
        'normal_geopotential_height_of_pressure_level',
        'normal_air_temperature',
        'normal_max_temperature_last_24h',
        'normal_min_temperature_last_24h',
        'normal_vapour_pressure',
        'normal_daily_mean_temp_deviation',
        'normal_total_sunshine',
        'rain_starting_reference_period_year',
        'rain_ending_reference_period_year',
        'normal_total_accumulated_precipitation',
        'normal_days_with_precipitation_above_1mm',
        'normal_pressure_missing_years',
        'normal_temperature_missing_years',
        'normal_extreme_temperature_missing_years',
        'normal_vapour_pressure_missing_years',
        'normal_rain_missing_years',
        'normal_sunshine_duration_missing_years',
        'normal_max_temperature_missing_years',
        'normal_min_temperature_missing_years',
    ],
    // TODO. Populate with actual TEMP (upper-air sounding) elements.
    [ReportTypeEnum.TEMP]: [],
    // TODO. Populate with actual METAR elements.
    [ReportTypeEnum.METAR]: [],
};

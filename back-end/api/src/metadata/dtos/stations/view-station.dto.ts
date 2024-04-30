import { CreateStationDto } from './create-update-station.dto';

export class ViewStationDto extends CreateStationDto {
    stationObsProcessingMethodName: string;
    stationObsEnvironmentName: string | null;
    stationObsFocusName: string | null;
}
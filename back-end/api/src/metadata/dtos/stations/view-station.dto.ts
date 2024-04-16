import { CreateUpdateStationDto } from './create-update-station.dto';

export class ViewStationDto extends CreateUpdateStationDto {
    stationObsProcessingMethodName: string;
    stationObsEnvironmentName: string | null;
    stationObsFocusName: string | null;
}
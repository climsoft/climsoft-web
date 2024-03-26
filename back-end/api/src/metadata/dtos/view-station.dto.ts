import { CreateUpdateStationDto } from './create-update-station.dto';

export class ViewStationDto extends CreateUpdateStationDto {
    stationObsEnvironmentName: string | null;
    stationObsFocusName: string | null;
}
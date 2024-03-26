import { CreateUpdateStationModel } from "./create-update-station.model";

export interface ViewStationModel extends CreateUpdateStationModel {
  stationObsEnvironmentName: string | null;
  stationObsFocusName: string | null;
}
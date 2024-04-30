import { CreateUpdateStationModel } from "./create-update-station.model";

export interface ViewStationModel extends CreateUpdateStationModel {
  stationObsProcessingMethodName: string;
  stationObsEnvironmentName: string | null;
  stationObsFocusName: string | null;
}
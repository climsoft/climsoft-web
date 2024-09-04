import { CreateStationModel } from "./create-station.model";

export interface ViewStationModel extends CreateStationModel {
  stationObsProcessingMethodName: string;
  stationObsEnvironmentName: string | null;
  stationObsFocusName: string | null;
}
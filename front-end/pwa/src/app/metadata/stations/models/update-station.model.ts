
import { StationProcessingMethodEnum } from "./station-processing-method.enum";
import { StationStatusEnum } from "./station-status.enum";

export interface UpdateStationModel {
  name: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  elevation?: number;
  stationObsProcessingMethod?: StationProcessingMethodEnum;
  stationObsEnvironmentId?: number;
  stationObsFocusId?: number;
  ownerId?: number;
  operatorId?: number;
  wmoId?: string;
  wigosId?: string;
  icaoId?: string;
  status?: StationStatusEnum;
  dateEstablished?: string;
  dateClosed?: string;
  comment?: string;
}
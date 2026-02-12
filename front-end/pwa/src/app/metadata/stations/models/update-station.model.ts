
import { StationObsProcessingMethodEnum } from "./station-obs-processing-method.enum";
import { StationStatusEnum } from "./station-status.enum"; 

export interface UpdateStationModel {
  name: string;
  description: string;
  longitude?: number | null;
  latitude?: number | null; 
  elevation?: number | null ;
  stationObsProcessingMethod: StationObsProcessingMethodEnum ;
  stationObsEnvironmentId: number | null;
  stationObsFocusId: number | null; 
  organisationId: number | null; 
  wmoId?: string | null; 
  wigosId?: string | null; 
  icaoId?: string | null;
  status?: StationStatusEnum | null;
  dateEstablished?: string | null;
  dateClosed?: string | null;
  comment?: string | null;
}
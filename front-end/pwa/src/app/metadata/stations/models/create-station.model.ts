import { UpdateStationModel } from "./update-station.model";

export interface CreateStationModel extends UpdateStationModel {
  id: string;
}
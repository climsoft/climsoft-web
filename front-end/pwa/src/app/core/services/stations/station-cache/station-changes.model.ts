import { ViewStationModel } from "../../../models/stations/view-station.model";

export interface StationChangesModel {
    // Updated stations
    updated: ViewStationModel[];

    // Total number of stations
    totalCount: number;
}
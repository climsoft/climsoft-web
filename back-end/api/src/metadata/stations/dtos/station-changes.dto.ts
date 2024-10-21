import { ViewStationDto } from "./view-station.dto";

export class StationChangesDto {
    // Updated stations
    updated: ViewStationDto[];

    // Total number of stations
    totalCount: number;
}
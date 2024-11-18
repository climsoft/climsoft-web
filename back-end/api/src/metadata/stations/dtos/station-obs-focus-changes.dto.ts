import { StationObservationFocusEntity } from "../entities/station-observation-focus.entity";

export class StationObsFocusChangesDto {
    // Updated stations
    updated: StationObservationFocusEntity[];

    // Total number of stations
    totalCount: number;
}
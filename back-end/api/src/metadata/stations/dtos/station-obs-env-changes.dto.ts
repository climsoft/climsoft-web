import { StationObsEnvironmentEntity } from "../entities/station-observation-environment.entity";

export class StationObsEnvChangesDto {
    // Updated stations
    updated: StationObsEnvironmentEntity[];

    // Total number of stations
    totalCount: number;
}
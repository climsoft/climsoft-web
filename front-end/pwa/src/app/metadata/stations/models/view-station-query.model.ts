import { StationProcessingMethodEnum } from "./station-processing-method.enum";

export class ViewStationQueryModel {
    stationIds?: string[];
    obsProcessingMethods?: StationProcessingMethodEnum[];
    obsEnvironmentIds?: number[];
    obsFocusIds?: number[];
    page?: number;
    pageSize?: number;
}
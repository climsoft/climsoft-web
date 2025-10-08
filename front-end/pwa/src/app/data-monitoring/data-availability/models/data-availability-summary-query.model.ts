import { DurationTypeEnum } from "./duration-type.enum";

export interface DataAvailabilitySummaryQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    interval?: number;
    level?: number;
    excludeConfirmedMissing?: boolean;
    durationType: DurationTypeEnum;
    fromDate: string;
    toDate: string;
}
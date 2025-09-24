export interface DataAvailabilityQueryModel {
    stationIds: string[];
    elementIds?: number[];
    interval?: number;
    level?: number;
    excludeConfirmedMissing?: boolean;
    durationType: DurationTypeEnum;
    fromDate: string;
    toDate: string;
}

export enum DurationTypeEnum {
    DAY,
    MONTH,
    YEAR,
    YEARS,
}
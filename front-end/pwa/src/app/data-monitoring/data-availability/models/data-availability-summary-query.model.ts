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

export enum DurationTypeEnum {
    DAY = 'day',
    MONTH = 'month',
    YEAR = 'year',
    YEARS = 'years',
}
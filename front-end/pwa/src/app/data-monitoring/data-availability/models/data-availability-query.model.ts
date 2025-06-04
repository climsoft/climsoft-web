export interface DataAvailabilityQueryModel {
    stationIds: string[];
    elementIds: number[];
    interval: number;
    level?: number;
    excludeMissingValues?: boolean;
    durationType: 'days_of_month' | 'months_of_year' | 'years';
    durationDaysOfMonth: string;
    durationMonthsOfYear: number;
    durationYears: number[];
}
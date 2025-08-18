export interface SourceCheckDuplicateModel {
    stationId: string;
    elementId: number;
    level: number;
    datetime: string
    interval: number;
    duplicates: number;
}
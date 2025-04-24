export interface StationStatusQueryModel {
    stationIds?: string[];
    elementId?: number;
    duration: number;
    durationType: 'hours' | 'days';
}


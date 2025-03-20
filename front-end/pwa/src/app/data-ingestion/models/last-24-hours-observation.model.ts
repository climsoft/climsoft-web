export interface Last24HoursObservations{
    elementId: number;
    level: number;
    datetime: string;
    interval: number;
    sourceId: number;
    value: number | null;
    flag: string | null;
}
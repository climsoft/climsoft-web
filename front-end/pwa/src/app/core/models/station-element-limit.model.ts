export interface StationElementLimitModel {
    monthName?: string;
    lowerLimit: number;
    upperLimit: number;    
    entryUserId: string;
    entryDateTime: string;
    log: string | null;
}
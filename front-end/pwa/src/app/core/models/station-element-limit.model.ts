export interface StationElementLimitModel {
    stationId: string;
    elementId: number;
    monthId: number;
    monthName: string;
    lowerLimit: number;
    upperLimit: number;    
    entryUserId: string;
    entryDateTime: string;
}
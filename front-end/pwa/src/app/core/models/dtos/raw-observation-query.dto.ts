export interface RawObservationQueryDto {
    stationId: string;
    sourceId: number;
    elementIds: number[];
    period: number;
    datetimes: string[];
}
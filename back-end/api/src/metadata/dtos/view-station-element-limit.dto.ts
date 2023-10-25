export class ViewStationElementLimitDto {
    monthId: number;
    lowerLimit: number;
    upperLimit: number;
    comment: string | null;
    entryUserId: string;
    entryDateTime: string;
    log: string | null;
}
export class ViewStationElementLimitDto {
    monthId: number;
    lowerLimit: number | null;
    upperLimit: number | null;
    comment: string | null;
    entryUserId: string;
    entryDateTime: string;
    log: string | null;
}
export enum StationStatusEnum {
    OPERATIONAL = "operational",
    CLOSED = "closed",
    UKNOWNN = "unknown", // TODO. deprecate this once we have database migrations built in. Currently TypeOM fails to update the enums when this is is removed. Nulls should automatically be interpreted as 'unknowns' which means we don't really need this enum type
}
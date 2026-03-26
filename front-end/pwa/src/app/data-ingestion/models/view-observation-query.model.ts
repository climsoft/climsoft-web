import { QCStatusEnum } from "./qc-status.enum";

export interface ViewObservationQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    intervals?: number[];
    level?: number;
    sourceIds?: number[];
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;
    hours?: number[];
    qcStatus?: QCStatusEnum;
    deleted?: boolean;
    page?: number;
    pageSize?: number;
}
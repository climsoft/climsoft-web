import { QCStatusEnum } from "src/observation/enums/qc-status.enum";

export interface ExportQueryModel {
    stationIds?: string[];

    elementIds?: number[];

    intervals?: number[];

    qcStatuses?: QCStatusEnum[];

    useEntryDate?: boolean;

    within?: {
        fromDate: string;
        toDate: string;
    };

    fromDate?: string;

    last?: number; // In minutes
}
import { QCStatusEnum } from "../data-ingestion/models/qc-status.enum";
import { ViewObservationQueryModel } from "../data-ingestion/models/view-observation-query.model";

export interface QCQueryModel extends ViewObservationQueryModel {
    qcStatus?: 'all' | 'none' | 'passed' | 'failed' | QCStatusEnum;
}
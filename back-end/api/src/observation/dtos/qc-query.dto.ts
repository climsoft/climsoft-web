import { QCStatusEnum } from "../enums/qc-status.enum";
import { ViewObservationQueryDTO } from "./view-observation-query.dto";

export interface QCQueryDto extends ViewObservationQueryDTO {
    qcStatus?: 'all' | 'none' | 'passed' | 'failed' | QCStatusEnum;
}
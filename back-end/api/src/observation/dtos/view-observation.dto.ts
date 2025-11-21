
import { QCTestLogVo } from "../entities/observation.entity";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { CreateObservationDto } from "./create-observation.dto";
import { ViewObservationLogDto } from "./view-observation-log.dto"; 

export class ViewObservationDto extends CreateObservationDto {
    qcStatus: QCStatusEnum;
    qcTestLog: QCTestLogVo[] | null;
    log: ViewObservationLogDto[];
    entryDatetime: string; 
}
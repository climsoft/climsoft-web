import { ObservationWindowDateFieldEnum } from "src/metadata/connector-specifications/dtos/create-connector-specification.dto";
import { QCStatusEnum } from "src/observation/enums/qc-status.enum";

export interface ExportQueryModel {
    stationIds?: string[];

    elementIds?: number[];

    intervals?: number[];

    qcStatuses?: QCStatusEnum[];

    //---------------------------
    // Observation Window
    dateField?: ObservationWindowDateFieldEnum;

    within?: {
        fromDate: string;
        toDate: string;
    };

    fromDate?: string;

    last?: number; // In minutes
    //---------------------------
}

import { ContextualQCTestParamsModel } from "./qc-test-parameters/contextual-qc-test-params.model";
import { DiurnalQCTestParamsModel } from "./qc-test-parameters/diurnal-qc-test-params.model";
import { FlatLineQCTestParamsModel } from "./qc-test-parameters/flat-line-qc-test-params.model";
import { RangeThresholdQCTestParamsModel } from "./qc-test-parameters/range-qc-test-params.model";
import { RelationalQCTestParamsModel } from "./qc-test-parameters/relational-qc-test-params.model";
import { RemoteSensingQCTestParamsModel } from "./qc-test-parameters/remote-sensing-qc-test-params.model";
import { SpatialQCTestParamsModel } from "./qc-test-parameters/spatial-qc-test-params.model";
import { SpikeQCTestParamsModel } from "./qc-test-parameters/spike-qc-test-params.model";
import { QCTestTypeEnum } from "./qc-test-type.enum";

export type QCTestParameters = RangeThresholdQCTestParamsModel | FlatLineQCTestParamsModel | SpikeQCTestParamsModel | RelationalQCTestParamsModel | DiurnalQCTestParamsModel | ContextualQCTestParamsModel | RemoteSensingQCTestParamsModel | SpatialQCTestParamsModel;

export interface CreateQCTestModel {
    name: string;
    description: string | null;
    elementId: number;
    observationLevel: number;
    observationInterval: number;
    qcTestType: QCTestTypeEnum;
    parameters: QCTestParameters;
    disabled: boolean;
    comment: string | null;
}


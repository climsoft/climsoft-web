import { ViewObservationModel } from "src/app/data-ingestion/models/view-observation.model";
import { QCTestCacheModel } from "src/app/metadata/qc-tests/services/qc-tests-cache.service";

export interface ObservationEntry {
  observation: ViewObservationModel;
  change: 'no_change' | 'valid_change' | 'invalid_change';
  confirmAsCorrect: boolean;
  delete: boolean;
  restore?: boolean;
  hardDelete?: boolean;
  stationName?: string;
  elementAbbrv?: string;
  sourceName?: string;
  formattedDatetime?: string;
  intervalName?: string;
  qcTestsFailed?: QCTestCacheModel[];
}
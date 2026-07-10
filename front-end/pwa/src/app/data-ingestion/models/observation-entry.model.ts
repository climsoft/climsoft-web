import { ViewObservationModel } from "src/app/data-ingestion/models/view-observation.model";
import { QCTestCacheModel } from "src/app/metadata/qc-tests/services/qc-specifications-cache.service";

export interface ObservationEntry {
  observation: ViewObservationModel;
  change: 'no_change' | 'valid_change' | 'invalid_change';
  confirmAsCorrect: boolean;
  delete: boolean;
  /**
   * Whether the value-flag control for this entry accepts user input.
   * Set false by form entry when the (element, hour) pair is disallowed by the form's per-element hours config.
   * Defaults to true in non-form-entry contexts (data correction, QC, etc.).
   */
  enabled?: boolean;
  restore?: boolean;
  hardDelete?: boolean;
  stationName?: string;
  elementAbbrv?: string;
  sourceName?: string;
  formattedDatetime?: string;
  intervalName?: string;
  qcTestsFailed?: QCTestCacheModel[];
  qcTestLogItems?: ViewObservationModel['qcTestLog'];
}
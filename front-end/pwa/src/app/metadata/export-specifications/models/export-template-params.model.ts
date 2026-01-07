import { QCStatusEnum } from "src/app/data-ingestion/models/qc-status.enum";

export interface ExportTemplateParametersModel {
  // Data
  convertDatetimeToDisplayTimeZone?: boolean;
  splitObservationDatetime?: boolean;
  unstackData?: boolean;
  includeLevel?: boolean;
  includeInterval?: boolean;
  includeFlag?: boolean;
  includeQCStatus?: boolean;
  includeQCTestLog?: boolean;
  includeComments?: boolean;
  includeEntryDatetime?: boolean;
  includeEntryUserEmail?: boolean;

  // Metadata
  includeStationName?: boolean;
  includeStationLocation?: boolean;
  includeStationElevation?: boolean;

  includeElementAbbreviation?: boolean;
  includeElementName?: boolean;
  includeElementUnits?: boolean;

  includeSourceName?: boolean;
}
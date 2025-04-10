import { QCStatusEnum } from "src/app/data-ingestion/models/qc-status.enum";

export interface ExportTemplateParametersModel {
  stationIds?: string[];
  elementIds?: number[];
  intervals?: number[];
  observationDate?: {
    last?: {
      duration: number,
      durationType: 'days'| 'hours' | 'minutes',
    };
    fromDate?: string;
    within?: {
      fromDate: string;
      toDate: string;
    };
  }; 

  qcStatus?: QCStatusEnum;

  // Data
  convertDatetimeToDisplayTimeZone?: boolean;
  splitObservationDatetime?: boolean;
  unstackData?: boolean;
  includeFlags?: boolean;
  includeQCStatus?: boolean;
  includeQCLog?: boolean;
  includeComments?: boolean;
  includeEntryDatetime?: boolean;
  includeEntryUserEmail?: boolean;

  // Metadata
  includeStationName?: boolean;
  includeStationLocation?: boolean;
  includeElementName?: boolean;
  includeElementUnits?: boolean;
}
export interface ExportTemplateParametersModel {
  stationIds?: string[];
  elementIds?: number[];
  period?: number; 
  ObservationDate?: {
    last?: number; // In days
    within?: {
      startDate: string;
      endDate: string;
    };
  };
  expression?: any;
}
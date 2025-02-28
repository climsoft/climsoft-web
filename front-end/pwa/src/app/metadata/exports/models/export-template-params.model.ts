export interface ExportTemplateParametersModel {
  stationIds?: string[];
  elementIds?: number[];
  period?: number;
  observationDate?: {
    last?: {
      duration: number,
      durationType: 'days' | 'minutes',
    };
    fromDate?: string;
    within?: {
      startDate: string;
      endDate: string;
    };
  };
  expression?: any;
}
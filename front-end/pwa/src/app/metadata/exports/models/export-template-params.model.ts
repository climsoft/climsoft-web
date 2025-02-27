export interface ExportTemplateParametersModel {
  stationIds?: string[];
  elementIds?: number[];
  period?: number;
  observationDate?: {
    last?: {
      duration: number,
      durationType: 'days' | 'minutes',
    };
    within?: {
      startDate: string;
      endDate: string;
    };
  };
  expression?: any;
}
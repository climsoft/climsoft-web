
export interface ClimsoftV4ImportParametersModel {
    fromEntryDate: string;

    stationIds?: string[];

    elements: ElementIntervalModel[];
  
}

export interface ElementIntervalModel{
    elementId: number; 
    interval: number;
}
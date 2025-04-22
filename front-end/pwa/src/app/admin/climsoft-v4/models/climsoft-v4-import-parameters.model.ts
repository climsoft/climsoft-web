
export interface ClimsoftV4ImportParametersModel {
    fromEntryDate: string;

    stationIds?: string[];

    elements: ElementIntervalModel[];

    includeClimsoftWebData: boolean;

    pollingInterval: number; // In minutes
}

export interface ElementIntervalModel {
    elementId: number;
    interval: number;
}
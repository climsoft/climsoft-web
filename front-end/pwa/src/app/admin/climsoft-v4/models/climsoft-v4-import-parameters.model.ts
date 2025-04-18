
export interface ClimsoftV4ImportParametersModel {
    fromEntryDate: string;

    stationIds?: string[];

    elements: ElementIntervalModel[];

    includeClimsoftWebData: boolean;
}

export interface ElementIntervalModel {
    elementId: number;
    interval: number;
}
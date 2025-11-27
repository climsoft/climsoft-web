export interface AllRangeThresholdModel {
    lowerThreshold: number;
    upperThreshold: number;
}

export interface MonthlyRangeThresholdModel {
    monthId: number;
    lowerThreshold: number;
    upperThreshold: number;
}

export interface RangeThresholdQCTestParamsModel  {
    stationIds?: string[];
    allRangeThreshold?: AllRangeThresholdModel;
    monthsThresholds?: MonthlyRangeThresholdModel[];
}


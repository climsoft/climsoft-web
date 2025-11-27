export interface ExcludeRangeModel {

    lowerThreshold: number;


    upperThreshold: number;
}

export interface FlatLineQCTestParamsModel {

    consecutiveRecords: number;

    flatLineThreshold: number;

    excludeRange?: ExcludeRangeModel;
}

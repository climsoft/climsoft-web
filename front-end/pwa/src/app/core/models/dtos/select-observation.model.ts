//TODO. deprecate this
export interface SelectObservation {
    stationId?: string;
    sourceId?: number; 
    elementIds?: number[];
    period?: number;
    fromDate?: string;//yyyy-mm-dd format
    toDate?: string;//yyyy-mm-dd format
    hours?: number[];

    year?: number; //todo. remove
    month?: number;//todo. remove
    day?: number;//todo. remove
   
    page?: number;
    pageSize?: number;
}
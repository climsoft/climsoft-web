import { RegionTypeEnum } from "./region-types.enum";

export interface ViewRegionQueryModel {
    regionIds?: number[];
    regionType?: RegionTypeEnum;
    page?: number;
    pageSize?: number;
}
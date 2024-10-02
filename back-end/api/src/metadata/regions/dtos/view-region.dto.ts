import { RegionTypeEnum } from "../enums/region-types.enum";


export interface ViewRegionDto  {
    id: number;
    name: string;
    description: string;
    regionType: RegionTypeEnum;
    boundary: number[][][][]; // multipolygon 
}
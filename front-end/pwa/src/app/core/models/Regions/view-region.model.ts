import { RegionTypeEnum } from "./region-types.enum";

export interface ViewRegionModel  {
    id: number;
    name: string;
    description: string;
    regionType: RegionTypeEnum;
    boundary: string; // A geojson 
}
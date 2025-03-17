import { IsEnum, IsOptional, IsString } from "class-validator"; 
import { RegionTypeEnum } from "../enums/region-types.enum";

export class CreateUpdateRegionDto  {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description: string| null;

    @IsEnum(RegionTypeEnum, { message: 'region type must be a valid RegionTypeEnum value' })
    regionType: RegionTypeEnum;

    @IsOptional()// TODO. Find away of validating this.
    boundary: number[][][][]; // multipolygon 
}
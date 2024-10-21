import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";
import { RegionTypeEnum } from "../enums/region-types.enum";

export class ViewRegionQueryDTO {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({each: true })
    regionIds?: number[];

    @IsOptional()
    @IsEnum(RegionTypeEnum, { message: 'region type must be a valid RegionTypeEnum value or undefined' })
    regionType?: RegionTypeEnum;

    @IsOptional()
    @IsInt()
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()   
    pageSize?: number;

}
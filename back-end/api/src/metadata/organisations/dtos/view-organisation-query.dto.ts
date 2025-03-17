import { Transform } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils"; 

export class ViewOrganisationQueryDTO {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({each: true })
    organisationIds?: number[];

    @IsOptional()
    @IsInt()
    page?: number; // TODO. Validate to make sure it is never less than 0

    @IsOptional()
    @IsInt()   
    pageSize?: number;

}
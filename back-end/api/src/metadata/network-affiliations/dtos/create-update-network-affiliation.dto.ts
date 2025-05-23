import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateUpdateNetworkAffiliationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description: string | null;

    @IsOptional()
    @IsInt()
    parentNetworkId: number | null;

    @IsOptional()
    @IsString()
    extraMetadata: string | null;

    @IsOptional()
    @IsString()
    comment: string | null;
}
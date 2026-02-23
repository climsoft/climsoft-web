import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateUpdateNetworkAffiliationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    extraMetadata?: Record<string, any>;

    @IsOptional()
    @IsString()
    comment?: string;
}
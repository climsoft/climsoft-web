import {  IsOptional, IsString } from "class-validator"; 


export class CreateUpdateOrganisationDto  {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description: string | null;

    @IsOptional()
    extraMetadata: string | null;

    @IsOptional()
    @IsString()
    comment: string | null;
}
import { IsNotEmpty, IsString, ValidateIf } from "class-validator";

export class CreateUpdateFlagDto {
    @IsString()
    @IsNotEmpty()
    abbreviation: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @ValidateIf(o => o.description !== null)
    @IsString()
    description: string | null;

    @ValidateIf(o => o.comment !== null)
    @IsString() 
    comment: string | null;
}

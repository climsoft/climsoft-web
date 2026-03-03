import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateElementDto {

    @IsString()
    @IsNotEmpty()
    abbreviation: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    units?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    typeId?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    entryScaleFactor?: number;

    @IsOptional()
    @IsString()
    comment?: string;
}
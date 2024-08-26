import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateElementDto {

    @IsString()
    name: string;

    @IsString()
    abbreviation: string;

    @IsString()
    description: string;

    @IsString()
    units: string;

    @IsInt()
    typeId: number;

    @IsOptional()
    @IsInt()
    lowerLimit: number | null;

    @IsOptional()
    @IsInt()
    upperLimit: number | null;

    @IsOptional()
    @IsInt()
    entryScaleFactor: number | null;

    @IsOptional()
    @IsString()
    comment: string | null;
}
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateElementDto {

    @IsString()
    abbreviation: string;

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    units: string;

    @IsInt()
    typeId: number;

    @IsOptional()
    @IsInt()
    entryScaleFactor: number | null;

    @IsOptional()
    @IsString()
    comment: string | null;
}
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

    @IsInt()
    entryScaleFactor: number;

    @IsOptional()
    @IsString()
    comment: string | null;
}
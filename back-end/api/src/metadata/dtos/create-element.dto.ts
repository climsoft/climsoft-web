import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateElementDto {
    @IsNumber()
    id: number;

    @IsString()
    name: string;

    @IsString()
    abbreviation: string;

    @IsString()
    description: string;

    @IsNumber()
    typeId: number;

    @IsNumber()
    lowerLimit: number;

    @IsNumber()
    upperLimit: number;

    @IsNumber()
    entryScaleFactor: number;

    @IsOptional()
    @IsString()
    comment: string | null;
}
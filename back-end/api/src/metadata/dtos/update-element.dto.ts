import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateElementDto {

    @IsOptional()
    @IsNumber()
    lowerLimit: number | null;

    @IsOptional()
    @IsNumber()
    upperLimit: number | null;

    @IsOptional()
    @IsNumber()
    entryScaleFactor: number| null;

    @IsOptional()
    @IsString()
    comment: string | null;
}
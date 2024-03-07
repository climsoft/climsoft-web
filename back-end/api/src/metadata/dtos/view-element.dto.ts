import { IsDate, IsString, IsNumber } from 'class-validator';

export class ViewElementDto {
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
    lowerLimit: number| null;

    @IsNumber()
    upperLimit: number| null;

    @IsNumber()
    entryScaleFactor: number| null;

    @IsString()
    comment: string | null; 

}
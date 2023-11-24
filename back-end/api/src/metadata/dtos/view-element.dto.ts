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
    lowerLimit: number;

    @IsNumber()
    upperLimit: number;

    @IsNumber()
    entryScaleFactor: number;

    @IsString()
    comment: string | null;

    @IsString()
    entryUserId: string;

    @IsDate()
    entryDateTime: string;
}
import { IsNumber, IsString } from 'class-validator';

export class CreateStationElementLimitDto {

    @IsNumber()
    lowerLimit: number;

    @IsNumber()
    upperLimit: number;

    @IsString()
    comment: string | null;
}
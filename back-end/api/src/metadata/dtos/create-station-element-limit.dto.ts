import { IsNumber, IsString } from 'class-validator';

export class CreateStationElementLimitDto {

    @IsNumber()
    monthId: number;

    @IsNumber()
    lowerLimit: number | null;

    @IsNumber()
    upperLimit: number | null;

    @IsString()
    comment: string | null;
}
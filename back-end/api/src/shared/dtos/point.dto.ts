import { IsNumber } from 'class-validator';

export class PointDTO {
    @IsNumber()
    x: number;

    @IsNumber()
    y: number;
}

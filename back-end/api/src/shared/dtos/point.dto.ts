import { IsNumber } from 'class-validator';

export class PointDTO {
    @IsNumber()
    longitude: number;

    @IsNumber()
    latitude: number;
}

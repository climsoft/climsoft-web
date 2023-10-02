import { IsString } from 'class-validator';

export class StationDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;
}
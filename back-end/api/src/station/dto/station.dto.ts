import { IsString } from 'class-validator';

export class StationDto {
    @IsString()
    readonly id: string;

    @IsString()
    readonly name: string;
}
import { IsString } from 'class-validator';

export class StationDto {
    @IsString()
    readonly name: string;
}
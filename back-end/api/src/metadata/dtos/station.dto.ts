import { IsString } from 'class-validator'; 

export class CreateStationDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;

}
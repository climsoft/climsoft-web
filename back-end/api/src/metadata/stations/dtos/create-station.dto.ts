
import { IsNotEmpty, IsString } from 'class-validator';
import { UpdateStationDto } from './update-station.dto';

export class CreateStationDto extends UpdateStationDto {
    @IsString()
    @IsNotEmpty()
    id: string;
}


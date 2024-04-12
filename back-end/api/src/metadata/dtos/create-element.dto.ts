import { IsInt } from 'class-validator';
import { UpdateElementDto } from './update-element.dto';

export class CreateElementDto extends UpdateElementDto {
    @IsInt()
    id: number;
}
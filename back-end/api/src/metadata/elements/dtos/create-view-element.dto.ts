import { IsInt } from 'class-validator';
import { UpdateElementDto } from './update-element.dto';

export class CreateViewElementDto extends UpdateElementDto {
    @IsInt()
    id: number;
}
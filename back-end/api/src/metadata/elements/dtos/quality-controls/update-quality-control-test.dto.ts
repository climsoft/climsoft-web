import { IsInt } from 'class-validator'; 
import { CreateQualityControlTestDto } from './create-quality-control-test.dto';

export class UpdateQualityControlTestDto extends CreateQualityControlTestDto  {
    @IsInt()
    id: number;  
}
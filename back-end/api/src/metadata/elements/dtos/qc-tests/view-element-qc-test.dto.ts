import { IsInt } from 'class-validator'; 
import { CreateElementQCTestDto } from './create-element-qc-test.dto';

export class ViewElementQCTestDto extends CreateElementQCTestDto  {
    @IsInt()
    id: number;  
}
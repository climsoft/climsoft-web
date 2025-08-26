import { IsInt } from 'class-validator';  
import { CreateQCTestDto } from './create-qc-test.dto';

export class ViewQCTestDto extends CreateQCTestDto  {
    @IsInt()
    id: number;  
}
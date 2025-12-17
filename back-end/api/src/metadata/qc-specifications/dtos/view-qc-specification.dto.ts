import { IsInt } from 'class-validator';   
import { CreateQCSpecificationDto } from './create-qc-specification.dto';

export class ViewQCSpecificationDto extends CreateQCSpecificationDto  {
    @IsInt()
    id: number;  
}
import { IsInt, IsString } from 'class-validator';
import { UpdateGeneralSettingDto } from './update-general-setting.dto';

export class CreateViewGeneralSettingDto extends UpdateGeneralSettingDto {
  @IsInt()
  id: number;
  
  @IsString()
  name: string;

  @IsString()
  description: string;
}


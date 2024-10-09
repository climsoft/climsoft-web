import { IsString } from 'class-validator';
import { UpdateGeneralSettingDto } from './update-general-setting.dto';

export class ViewGeneralSettingDto extends UpdateGeneralSettingDto {
  @IsString()
  id: string;

  @IsString()
  description: string;
}


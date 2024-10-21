import { IsOptional } from "class-validator";

export class UpdateGeneralSettingDto {
 
  //@IsObject() // TODO. validate this depending on the setting id
  @IsOptional() // TODO. Temporary until we implement validate nested
  parameters: SettingsParametersValidity;

}

export interface SettingsParametersValidity{
  isValid(): boolean;
}


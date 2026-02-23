import { SettingIdEnum } from "./setting-id.enum";
import { GeneralSettingParameters } from "./update-general-setting.model";

export interface ViewGeneralSettingModel {
  id: SettingIdEnum;
  name: string;
  description: string;
  parameters: GeneralSettingParameters;
}


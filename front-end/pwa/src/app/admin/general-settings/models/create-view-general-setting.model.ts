import { SettingIdEnum } from "./setting-id.enum";
import { UpdateGeneralSettingModel } from "./update-general-setting.model";

export interface CreateViewGeneralSettingModel extends UpdateGeneralSettingModel {
  id: SettingIdEnum;
  name: string;
  description: string;
}


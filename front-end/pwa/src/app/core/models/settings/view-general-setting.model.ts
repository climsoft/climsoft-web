import { UpdateGeneralSettingModel } from "./update-general-setting.model";

export interface ViewGeneralSettingModel extends UpdateGeneralSettingModel{
  id: string;
  description: string;
}


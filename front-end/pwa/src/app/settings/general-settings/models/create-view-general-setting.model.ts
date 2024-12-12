import { UpdateGeneralSettingModel } from "./update-general-setting.model";

export interface CreateViewGeneralSettingModel extends UpdateGeneralSettingModel{
  id: number;
  name: string;
  description: string;
}


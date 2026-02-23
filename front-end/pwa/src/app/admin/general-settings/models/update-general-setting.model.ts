import { ClimsoftBoundaryModel } from "./settings/climsoft-boundary.model";
import { ClimsoftDisplayTimeZoneModel } from "./settings/climsoft-display-timezone.model";
import { SchedulerSettingModel } from "./settings/scheduler-setting.model";

export type GeneralSettingParameters = ClimsoftBoundaryModel | ClimsoftDisplayTimeZoneModel | SchedulerSettingModel;

export interface UpdateGeneralSettingParametersModel { 
  parameters: GeneralSettingParameters | null;
}




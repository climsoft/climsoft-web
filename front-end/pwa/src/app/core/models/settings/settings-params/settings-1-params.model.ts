import { SettingsParametersValidity } from "../update-general-setting.model";

export interface Settings1ParamsModel extends SettingsParametersValidity  {
    longitude: number;
    latitude: number;
    zoomLevel: number;
}




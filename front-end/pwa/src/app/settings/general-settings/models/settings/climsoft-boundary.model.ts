import { SettingsParametersValidity } from "../update-general-setting.model";

export interface ClimsoftBoundaryModel extends SettingsParametersValidity  {
    longitude: number;
    latitude: number;
    zoomLevel: number;
}




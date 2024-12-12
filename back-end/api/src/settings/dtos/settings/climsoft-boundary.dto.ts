import { SettingsParametersValidity } from "../update-general-setting.dto";

export class ClimsoftBoundaryDto implements SettingsParametersValidity {
    longitude: number;
    latitude: number;
    zoomLevel: number;
    isValid(): boolean {
        return true; // TODO.
    }
}




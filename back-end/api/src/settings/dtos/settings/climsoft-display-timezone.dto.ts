import { SettingsParametersValidity } from "../update-general-setting.dto";

export class ClimsoftDisplayTimeZoneDto implements SettingsParametersValidity {
    utcOffSet: number; 
    isValid(): boolean {
        return true; // TODO.
    }
}




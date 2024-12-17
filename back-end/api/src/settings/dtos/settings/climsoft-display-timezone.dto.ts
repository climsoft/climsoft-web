import { SettingsParametersValidity } from "../update-general-setting.dto";

export class ClimsoftDisplayTimeZoneDto implements SettingsParametersValidity {
    utcOffset: number; 
    isValid(): boolean {
        return true; // TODO.
    }
}




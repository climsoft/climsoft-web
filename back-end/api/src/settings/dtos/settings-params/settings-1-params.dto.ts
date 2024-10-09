import { SettingsParametersValidity } from "../update-general-setting.dto";

export class Settings1ParamsDto implements SettingsParametersValidity {
    longitude: number;
    latitude: number;
    zoomLevel: number;
    isValid(): boolean {
        return true; // TODO.
    }

    default(): Settings1ParamsDto {
        const dto : Settings1ParamsDto = new Settings1ParamsDto();
        // Kenya, Isiolo coordinates 
        dto.longitude = 37.59162;
        dto.latitude = 0.36726;

        dto.zoomLevel = 6;
        return dto;
    }
}




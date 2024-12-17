import { IsInt, IsNumber, IsOptional } from "class-validator";
import { SettingsParametersValidity } from "../update-general-setting.dto";

export class ClimsoftBoundaryDto implements SettingsParametersValidity {
    @IsNumber()
    longitude: number;
    
    @IsNumber()
    latitude: number;

    @IsInt()
    zoomLevel: number;

    @IsOptional()
    boundary: number[][][][]; // multipolygon
    isValid(): boolean {
        return true; // TODO.
    }
}




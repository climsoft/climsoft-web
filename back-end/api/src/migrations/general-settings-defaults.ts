import { CreateViewGeneralSettingDto } from "src/settings/dtos/create-view-general-setting.dto";
import { ClimsoftBoundaryDto } from "src/settings/dtos/settings/climsoft-boundary.dto";
import { ClimsoftDisplayTimeZoneDto } from "src/settings/dtos/settings/climsoft-display-timezone.dto";

export class GeneralSettingsDefaults {
    public static readonly GENERAL_SETTINGS: CreateViewGeneralSettingDto[] = [
        {
            id: 1,
            name: 'Climsoft boundary',
            description: 'The default geographical boundary coordinates that Climsoft manages data and zoom level that the map will center on when it is first loaded.',
            parameters: {
                longitude: 37.59162,
                latitude: 0.36726,
                zoomLevel: 6
            } as ClimsoftBoundaryDto
        },
        {
            id: 2,
            name: 'Display time zone',
            description: 'Time zone used by climsoft front end for data querying and display.',
            parameters: {
                utcOffset: 0,
                isValid: () => true
            } as ClimsoftDisplayTimeZoneDto
        },
        {
            id: 3,
            name: 'Scheduler',
            description: 'Settings related to the scheduler that runs the connectors, QC, cleaning up of session files and alerts.',
            parameters: {
                utcOffset: 0,
                isValid: () => true
            }
        },

    ];

}

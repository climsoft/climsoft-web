import { CreateViewGeneralSettingDto } from "src/settings/dtos/create-view-general-setting.dto";
import { ClimsoftBoundaryDto } from "src/settings/dtos/settings/climsoft-boundary.dto";
import { ClimsoftDisplayTimeZoneDto } from "src/settings/dtos/settings/climsoft-display-timezone.dto";
import { ClimsoftV4DBSettingsDto } from "src/settings/dtos/settings/climsoft-v4-db.dto";

export class GeneralSettingsDefaults {
    public static readonly GENERAL_SETTINGS: CreateViewGeneralSettingDto[] = [
        {
            id: 1,
            name: 'Climsoft version 4 database',
            description: 'Version 4 database connection settings.',
            parameters: {
                saveToV4DB: false,
                serverIPAddress: 'host.docker.internal', // For easier docker management support connecting to the host machine only.
                username: 'my_user',   // MariaDB username
                password: 'my_password',  // MariaDB password
                databaseName: 'mariadb_climsoft_db_v4', // MariaDB database name 
                port: 3306,
                utcOffset: 0,
                isValid: () => { return true },

            } as ClimsoftV4DBSettingsDto
        },
        {
            id: 2,
            name: 'Climsoft boundary',
            description: 'The default geographical boundary coordinates that Climsoft manages data and zoom level that the map will center on when it is first loaded.',
            parameters: {
                longitude: 37.59162,
                latitude: 0.36726,
                zoomLevel: 6
            } as ClimsoftBoundaryDto
        },
        {
            id: 3,
            name: 'Display time zone',
            description: 'Time zone used by climsoft front end for data querying and display.',
            parameters: {
                utcOffset: 0,
                isValid: () => true
            } as ClimsoftDisplayTimeZoneDto
        }, 

    ];

}

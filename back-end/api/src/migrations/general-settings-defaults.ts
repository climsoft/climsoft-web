import { CreateViewGeneralSettingDto } from "src/settings/dtos/create-view-general-setting.dto";
import { ClimsoftBoundaryDto } from "src/settings/dtos/settings/climsoft-boundary.dto";
import { ClimsoftDisplayTimeZoneDto } from "src/settings/dtos/settings/climsoft-display-timezone.dto";
import { ClimsoftV4DBDto } from "src/settings/dtos/settings/climsoft-v4-db.dto";

export class GeneralSettingsDefaults {
    public static readonly GENERAL_SETTINGS: CreateViewGeneralSettingDto[] = [
        {
            id: 1,
            name: 'Climsoft version 4 database',
            description: 'Version 4 database connection settings and elements mapping.',
            parameters: {
                saveToV4DB: false,
                serverIPAddress: 'localhost', // e.g., 'localhost' or the server's IP address
                username: 'my_user',   // MariaDB username
                password: 'my_password',  // MariaDB password
                databaseName: 'mariadb_climsoft_db_v4', // MariaDB database name 
                port: 3306,
                isValid: () => { return true }

            } as ClimsoftV4DBDto
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

    public static readonly V4_V5_ELEMENTS_MAPPER: { v4Id: number, v5Id: number, v4Period: 'daily' | 'hourly' }[] = [
        { v4Id: 1, v5Id: 10, v4Period: 'daily' }, // temp mean
        { v4Id: 2, v5Id: 8, v4Period: 'daily' }, // temp max
        { v4Id: 3, v5Id: 9, v4Period: 'daily' }, // temp min
        { v4Id: 4, v5Id: 10, v4Period: 'daily' }, // temp mean
        { v4Id: 5, v5Id: 1, v4Period: 'daily' }, // Precip daily
        { v4Id: 15, v5Id: 13, v4Period: 'daily' },// RH  daily max
        { v4Id: 16, v5Id: 14, v4Period: 'daily' },// RH  daily min
        { v4Id: 17, v5Id: 15, v4Period: 'daily' }, // RH  daily mean,
        { v4Id: 111, v5Id: 18, v4Period: 'daily' }, // Wind speed 
        { v4Id: 112, v5Id: 19, v4Period: 'daily' }, // Wind direction
        { v4Id: 101, v5Id: 11, v4Period: 'daily' }, // Temp dry bulb
        { v4Id: 102, v5Id: 12, v4Period: 'daily' }, // Temp wet bulb 
    ]

}

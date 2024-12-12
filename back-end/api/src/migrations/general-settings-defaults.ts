import { CreateViewGeneralSettingDto } from "src/settings/dtos/create-view-general-setting.dto"; 
import { ClimsoftBoundaryDto } from "src/settings/dtos/settings/climsoft-boundary.dto";
import { ClimsoftV4DBDto } from "src/settings/dtos/settings/climsoft-v4-db.dto";

export class GeneralSettingsDefaults {
    public static GENERAL_SETTINGS: CreateViewGeneralSettingDto[] = [
        { 
            id: 1,
            name: 'Climsoft version 4 database',
            description: 'Version 4 database connection settings and elements mapping.',
            parameters: {
                saveToV4DB: false,
                serverIPAddress: 'localhost', // e.g., 'localhost' or the server's IP address
                username: 'my_user',   // MariaDB username
                password: 'my_password',  // MariaDB password
                databaseName: 'mariadb_climsoft_test_db_v4', // MariaDB database name 
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
      
    ];

    public static V4_V5_ELEMENTS_MAPPER : { v4Id: number, v5Id: number }[] = [
        { v4Id: 1, v5Id: 10 }, // temp mean
        { v4Id: 2, v5Id: 8 }, // temp max
        { v4Id: 3, v5Id: 9 }, // temp min
       // { v4Id: 4, v5Id: 1 },
        { v4Id: 5, v5Id: 1 }, // Precip daily
        { v4Id: 15, v5Id: 13 },// RH  daily max
        { v4Id: 16, v5Id: 14 },// RH  daily min
        { v4Id: 17, v5Id: 15 }, // RH  daily mean,
        { v4Id: 111, v5Id: 18 }, // Wind speed 
        { v4Id: 112, v5Id: 19 }, // Wind direction
        { v4Id: 101, v5Id: 11 }, // Temp dry bulb
        { v4Id: 102, v5Id: 12 }, // Temp wet bulb 
    ]

}

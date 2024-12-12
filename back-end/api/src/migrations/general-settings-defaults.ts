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
                elementsMapper: [
                    { v4Id: 1, v5Id: 1 },// TODO. Cgange the correct order of GCOS ECVS
                ],
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
      

    ]

}

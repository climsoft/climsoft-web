import { SettingsParametersValidity } from "../update-general-setting.model";


export interface ClimsoftV4DBSettingModel extends SettingsParametersValidity {
    saveToV4DB: boolean;
    serverIPAddress: string; // e.g., 'localhost' or the server's IP address
    username: string   // MariaDB username
    password: string;  // MariaDB password
    databaseName: string; // MariaDB database name 
    port: number;
    utcOffset: number;
}




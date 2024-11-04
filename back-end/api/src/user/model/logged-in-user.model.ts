import { UserRoleEnum } from "../enums/user-roles.enum";

export interface LoggedInUserModel {
    id: number;  
    username: string; // Used when saving observations to V4 database
    role: UserRoleEnum;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
}

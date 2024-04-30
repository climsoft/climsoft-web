import { UserRoleEnum } from "../enums/user-roles.enum";

export interface LoggedInUserModel {
    id: number;  
    role: UserRoleEnum;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
}

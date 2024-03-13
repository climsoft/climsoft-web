import { UserRole } from "./enums/user-roles.enum";

export interface LoggedInUserModel {
    id: number;
    roleId: UserRole;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
    expirationDate?: number; //milliseconds
}
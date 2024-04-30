import { UserRoleEnum } from "./user-role.enum";

export interface LoggedInUserModel {
    id: number;
    role: UserRoleEnum;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
    expirationDate?: number; //milliseconds
}
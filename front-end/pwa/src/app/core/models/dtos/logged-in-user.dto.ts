import { UserRole } from "../enums/user-roles.enum";

export interface LoggedInUserDto {
    id: number;
    roleId: UserRole;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
    expirationDate?: number; //milliseconds
}
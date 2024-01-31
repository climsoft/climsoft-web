import { UserRole } from "../enums/user-roles.enum";

export class LoggedInUserDto {
    id: number;  
    roleId: UserRole;
    authorisedStationIds: string[] | null; 
    expiresIn: number; //milliseconds
}

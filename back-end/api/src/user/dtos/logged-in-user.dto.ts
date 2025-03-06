import { UserPermissionDto } from "./user-permission.dto"; 

export class LoggedInUserDto {
    id: number;  
    username: string; // Used when saving observations to V4 database
    isSystemAdmin: boolean;
    permissions: UserPermissionDto | null; 
    expiresIn: number; //milliseconds
}

import { UserPermissionModel } from "./user-permission.model";

export interface LoggedInUserModel {
    id: number;  
    username: string; // Used when saving observations to V4 database
    isSystemAdmin: boolean;
    permissions: UserPermissionModel | null; 
    expiresIn: number; //milliseconds
}
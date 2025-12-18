import { UserPermissionDto } from "./permissions/user-permission.dto";

export class LoggedInUserDto {
    id: number;
    name: string;
    email: string;
      // TODO. Deprecate this and use email after preview-2 is released, all preview-1 user sessions will have expired
    username: string; 
    
    isSystemAdmin: boolean;
    permissions: UserPermissionDto | null;
    expiresIn: number; //milliseconds
}

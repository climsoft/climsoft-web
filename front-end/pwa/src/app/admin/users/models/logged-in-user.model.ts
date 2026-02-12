import { UserPermissionModel } from "./permissions/user-permission.model";

export interface LoggedInUserModel {
    id: number;
    name: string;
    email: string;
    isSystemAdmin: boolean;
    permissions: UserPermissionModel | null;
    expiresIn: number; //milliseconds
}
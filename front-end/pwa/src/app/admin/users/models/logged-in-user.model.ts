import { UserPermissionModel } from "./user-permission.model";

export interface LoggedInUserModel {
    id: number;
    name: string;
    email: string;
    // Used when saving observations to V4 database
    // TODO. Deprecate this and use email after preview-2 is released, all preview-1 user sessions will have expired by then
    username: string;
    isSystemAdmin: boolean;
    permissions: UserPermissionModel | null;
    expiresIn: number; //milliseconds
}
import { UserPermissionModel } from "./user-permission.model"; 

export interface CreateUserModel{
    name: string;
    email: string;
    phone: string;
    isSystemAdmin: boolean;
    permissions: UserPermissionModel | null;
    groupId: number | null;
    extraMetadata: string | null; //TODO. Determine Structure
    disabled: boolean;
    comment: string | null;
}
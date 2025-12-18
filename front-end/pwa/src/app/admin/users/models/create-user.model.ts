import { UserPermissionModel } from "./permissions/user-permission.model"; 

export interface CreateUserModel{
    name: string;
    email: string;
    phone: string | null;
    isSystemAdmin: boolean;
    permissions: UserPermissionModel | null;
    groupId: number | null;
    extraMetadata: string | null; //TODO. Determine Structure
    disabled: boolean;
    comment: string | null;
}
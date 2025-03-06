import { UserPermissionModel } from "./user-permission.model";

export interface CreateUserGroupModel {
    name: string;
    description: string;
    permissions: UserPermissionModel | null;
    comment: string | null;
}

import { UserPermissionModel } from "./user-permission.model";

export interface CreateUserGroupModel {
    name: string;
    description: string;
    permissions: UserPermissionModel;
    comment: string | null;
}

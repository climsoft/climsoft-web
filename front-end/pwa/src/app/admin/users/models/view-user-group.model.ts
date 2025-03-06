import { UserPermissionModel } from "./user-permission.model";

export interface ViewUserGroupModel {
    id: number;
    name: string;
    description: string;
    permissions: UserPermissionModel | null;
    comment: string | null;
}

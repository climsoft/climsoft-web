import { UserPermissionModel } from "./user-permission.model";

export interface ViewUserGroupModel {
    id: number;
    name: string;
    description: string;
    permissions: UserPermissionModel;
    comment: string | null;
}

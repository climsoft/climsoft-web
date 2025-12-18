
import { UserPermissionDto } from "./permissions/user-permission.dto";

export class ViewUserGroupDto {
    id: number;
    name: string;
    description: string;
    permissions: UserPermissionDto ;
    comment: string | null;
}


import { UserPermissionDto } from "./user-permission.dto";

export class ViewUserGroupDto {
    id: number;
    name: string;
    description: string;
    permissions: UserPermissionDto | null;
    comment: string | null;
}

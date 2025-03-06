
import { IsOptional, IsString } from "class-validator";
import { UserPermissionDto } from "./user-permission.dto";
export class CreateUserGroupDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    // TODO. Not optional, validate the structure
    permissions: UserPermissionDto | null;

    @IsOptional()
    @IsString()
    comment: string | null;
    

}

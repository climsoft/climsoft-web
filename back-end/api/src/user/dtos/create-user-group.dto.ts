
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { UserPermissionDto } from "./permissions/user-permission.dto";
export class CreateUserGroupDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional()
    //@ValidateNested()  // TODO. validate the structure
    permissions: UserPermissionDto ;

    @IsOptional()
    @IsString()
    comment: string | null;
}

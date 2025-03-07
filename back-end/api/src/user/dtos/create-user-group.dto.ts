
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { UserPermissionDto } from "./user-permission.dto";
export class CreateUserGroupDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    // TODO. Not optional, validate the structure
    @ValidateNested()
    permissions: UserPermissionDto;

    @IsOptional()
    @IsString()
    comment: string | null;
}

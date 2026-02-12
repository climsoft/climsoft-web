
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from "class-validator";
import { UserPermissionDto } from "./permissions/user-permission.dto";
export class CreateUserDto {
    @IsString()
    name: string; // validate to not allow empty

    @IsEmail()
    email: string; // validate to not allow empty

    @IsOptional()
    @IsString()
    phone: string | null; // validate to not allow empty

    @IsBoolean()
    isSystemAdmin: boolean;

    // TODO. Validate the permission structure and this is not optional only nullable
    @IsOptional()
    permissions: UserPermissionDto | null;

    @IsOptional()
    @IsInt()
    groupId: number | null;

    @IsOptional()
    @IsString()
    extraMetadata: string | null; //TODO. Determine Structure

    @IsBoolean()
    disabled: boolean;

    @IsOptional()
    @IsString()
    comment: string | null;

}


import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from "class-validator";
import { UserPermissionDto } from "./user-permission.dto";
export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    phone: string;

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

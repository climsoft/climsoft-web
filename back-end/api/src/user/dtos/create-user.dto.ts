
import {IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { UserRoleEnum } from "../enums/user-roles.enum";
export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsEnum(UserRoleEnum, { message: 'User role must be a valid value' })
    role: UserRoleEnum;

    @IsOptional()
    @IsString({each: true})
    authorisedStationIds: string[] | null;

    @IsBoolean()
    canDownloadData: boolean;

    @IsOptional()
    @IsInt({each: true})
    authorisedElementIds: number[] | null;

    @IsOptional()
    @IsString()
    extraMetadata: string | null; //TODO. Later set the model

    @IsBoolean()
    disabled: boolean;
}

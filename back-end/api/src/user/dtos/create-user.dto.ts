
import {IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
export class CreateUserDto {
    @IsString()
    name: string;

    @IsString()
    email: string;

    @IsString()
    phone: string;

    @IsNumber()
    roleId: number;

    @IsOptional()
    @IsString({each: true})
    authorisedStationIds: string[] | null;

    @IsOptional()
    @IsString()
    extraMetadata: string | null;

    @IsBoolean()
    disabled: boolean;
}

import { IsInt, IsString } from "class-validator";

export class ChangePasswordDto {
    @IsInt()
    userId: number;

    @IsString() // todo. validate the password characters
    password: string;
}

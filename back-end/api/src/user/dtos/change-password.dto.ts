import { IsInt, IsString } from "class-validator";


export class ChangePasswordDto {
    @IsInt()
    userId: number;

    @IsString() // todo. validate the passowrd characters
    password: string;
}

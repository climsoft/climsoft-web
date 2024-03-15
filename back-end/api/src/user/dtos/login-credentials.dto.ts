import { IsEmail, IsString } from "class-validator";

export class LogInCredentialsDto {
    //@IsEmail()
    @IsEmail()
    email: string;
    // TODO. Do password validations here
    @IsString()
    password: string
}
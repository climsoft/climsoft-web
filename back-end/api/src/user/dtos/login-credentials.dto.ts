import { IsEmail, IsString } from "class-validator";

export class LogInCredentialsDto {
    @IsEmail()
    email: string;
    // TODO. Do password validations here. For instance no empty password is allowed
    @IsString()
    password: string
}
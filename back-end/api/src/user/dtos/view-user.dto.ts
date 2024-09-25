import { IsInt } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class ViewUserDto extends CreateUserDto {
    @IsInt()
    id: number;
}

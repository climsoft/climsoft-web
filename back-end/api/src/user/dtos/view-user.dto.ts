import { UserRoleEnum } from "../enums/user-roles.enum";

export class ViewUserDto {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: UserRoleEnum; 
    disabled: boolean;
}

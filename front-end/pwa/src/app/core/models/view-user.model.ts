import { UserRoleEnum } from "./enums/user-roles.enum";

export interface ViewUserModel {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: UserRoleEnum;   
    disabled: boolean; 
}

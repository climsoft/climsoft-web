import { UserRoleEnum } from "./enums/user-role.enum";

export interface CreateUserModel{
    name: string;
    email: string;  
    phone: string;
    role: UserRoleEnum;   
    authorisedStationIds: string[] | null;
    extraMetadata: string | null;
    disabled: boolean;
}
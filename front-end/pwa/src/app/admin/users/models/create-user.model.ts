import { UserRoleEnum } from "./user-role.enum";

export interface CreateUserModel{
    name: string;
    email: string;  
    phone: string;
    role: UserRoleEnum;   
    authorisedStationIds: string[] | null;
    canDownloadData: boolean;
    authorisedElementIds: number[] | null;
    extraMetadata: string | null;
    disabled: boolean;
}
import { Type } from "class-transformer"; 
export class CreateUserDto{
    @Type(() => String) 
    name: string;
    email: string;  
    phone: string;

    @Type(() => Number) 
    roleId: number;
   
    authorisedStationIds: string[] | null;

    extraMetadata: string | null;

    disabled: boolean;
}

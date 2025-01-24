import { CreateUserModel } from "./create-user.model";
import { UserRoleEnum } from "./user-role.enum";

export interface ViewUserModel extends CreateUserModel {
    id: number;
}

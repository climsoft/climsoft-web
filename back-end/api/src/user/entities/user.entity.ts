import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserGroupEntity } from "./user-group.entity";
import { UserPermissionDto } from "../dtos/user-permission.dto";

@Entity("users")
@Check("CHK_users_name_not_empty", `"name" <> ''`)
@Check("CHK_users_email_not_empty", `"email" <> ''`)
@Check("CHK_users_password_not_empty", `"hashed_password" <> ''`)
@Check("CHK_users_admin_no_permissions_or_user_has_permissions",
  `("is_system_admin" = true AND "permissions" IS NULL) OR ("is_system_admin" = false AND "permissions" IS NOT NULL)`) // SYstem admins must not have permissions because they can access all the features
export class UserEntity {

  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ name: "name", type: 'varchar' })
  name: string;

  @Column({ name: "email", type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", unique: true })
  phone: string;

  @Column({ name: "hashed_password", type: "varchar" })
  hashedPassword: string;

  @Column({ type: "boolean", name: 'is_system_admin' })
  isSystemAdmin: boolean;

  // User group for permissions assignments
  // -----------------------------------------
  @Column({ name: "group_id", type: "int", nullable: true })
  groupId: number | null;

  @ManyToOne(() => UserGroupEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "group_id" })
  group: UserGroupEntity | null;
  // -----------------------------------------
  
  @Column({ type: "jsonb", name: "permissions", nullable: true })
  permissions: UserPermissionDto | null;

  @Column({ type: "jsonb", name: "extra_metadata", nullable: true })
  extraMetadata: string | null; //TODO. Determine Structure

  @Column({ type: "boolean", default: false })
  disabled: boolean;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  // This will be set by a trigger
  @Column({ name: "entry_date_time", type: 'timestamptz', })
  entryDateTime: Date;

  @Column({ type: 'jsonb', nullable: true })
  log: UserLogVo[] | null;
}


// Note should not extend the BaseLogVo.
// This structure will be changed when logging is done.
export interface UserLogVo {
  name: string;
  email: string;
  phone: string;
  password: string;
  //roleId: UserRoleEnum;
  //authorisedStationIds: string[] | null;
  extraMetadata: string | null;
  reset: boolean;
  disabled: boolean;
}
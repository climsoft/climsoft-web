import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm"; 
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { UserPermissionDto } from "../dtos/user-permission.dto";

@Entity("user_groups")
@Check("CHK_user_groups_name_not_empty", `"name" <> ''`)
export class UserGroupEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({type: 'int'})
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: "jsonb", name: "permissions", nullable: true })
  permissions: UserPermissionDto | null;

  @Column({ name: 'comment', type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;   // TODO. Define structure.
}
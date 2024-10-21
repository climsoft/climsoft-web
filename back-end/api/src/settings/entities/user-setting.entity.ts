import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { GeneralSettingEntity } from "./general-setting.entity";
import { UserEntity } from "src/user/entities/user.entity";

@Entity("user_settings")
export class UserSettingEntity extends AppBaseEntity {

  @PrimaryColumn({ name: "user_id", type: "int" })
  userId: number;

  @PrimaryColumn({ name: 'general_setting_id', type: 'int' })
  generalSettingId: number;

  @Column({ name: 'parameters', type: 'jsonb' })
  parameters: string; // will vary depending on the setting

  @Column({ name: 'log', type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;

  // Relationships

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" }) 
  @JoinColumn({ name: "user_id" }) 
  user: UserEntity;

  @ManyToOne(() => GeneralSettingEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "general_setting_id" })
  generalSetting: GeneralSettingEntity;
  
}


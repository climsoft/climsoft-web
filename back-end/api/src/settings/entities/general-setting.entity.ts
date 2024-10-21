import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { SettingsParametersValidity } from "../dtos/update-general-setting.dto";


@Entity("general_settings")
export class GeneralSettingEntity extends AppBaseEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id: string;

  @Column({ name: 'description', type: 'varchar', unique: true })
  description: string;

  @Column({ name: 'parameters', type: 'jsonb' })
  parameters: SettingsParametersValidity; // will vary depending on the setting

  @Column({ name: 'log', type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}


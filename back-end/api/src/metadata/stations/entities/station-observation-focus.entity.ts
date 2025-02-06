import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_observation_focuses")
export class StationObservationFocusEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: 'log', type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}

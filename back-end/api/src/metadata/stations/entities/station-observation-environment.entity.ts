import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Note, these will be populated by the cdms itself, so no user is responsible for entering them. Thus it should not inherit the base entity
 */

@Entity("station_observation_environments")
export class StationObservationEnvironmentEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar" })
  description: string;

}

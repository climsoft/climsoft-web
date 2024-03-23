import { BaseEntity } from "src/shared/entity/base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_observation_environments")
export class StationObservationEnvironmentEntity extends BaseEntity {
  @PrimaryColumn({ type: "int" })
  id: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar"})
  description: string;

}

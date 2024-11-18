import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_observation_focuses")
export class StationObservationFocusEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar" })
  description: string;

}

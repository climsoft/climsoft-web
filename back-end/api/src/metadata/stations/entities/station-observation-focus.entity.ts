import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Note, these will be populated by the cdms itself, so no user is responsible for entering them. Thus it should not inherit the base entity
 */

@Entity("station_observation_focuses")
export class StationObservationFocusEntity {
  @PrimaryColumn({ type: "int" })
  id: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar"})
  description: string;

}

import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Point, PrimaryColumn } from "typeorm";
import { StationStatusEnum } from "../enums/station-status.enum";
import { StationObsProcessingMethodEnum as StationObsProcessingMethodEnum } from "../enums/station-obs-processing-method.enum";
import { StationObservationFocusEntity as StationObsFocusEntity } from "./station-observation-focus.entity";
import { StationObsEnvironmentEntity } from "./station-observation-environment.entity";

import { PointColumnTransformer } from "src/shared/column-transformers/point-transformer";

@Entity("stations")
export class StationEntity extends AppBaseEntity {
  @PrimaryColumn({ name: "id", type: 'varchar' })
  id: string;

  @Column({ name: "name", type: 'varchar', unique: true })
  name: string;

  @Column({ name: "description", type: 'varchar' })
  description: string;

  // TODO. Create a separate table for station history. Important for tracking station movements
  // Reason as to why station location table is important when it comes to moving stations like aircrafts.
  // Note using the location, we can determine all regions, drainage basins and other spatial features that the station belongs. So no need for foreign keys!
  @Column({ name: "location", type: 'point' })
  @Index({ spatial: true })
  location: Point;

  @Column({ type: 'float' })
  @Index()
  elevation: number;  // Elevation of station above mean sea level.

  @Column({ name: "observation_processing_method", type: "enum", enum: StationObsProcessingMethodEnum, nullable: true })
  @Index()
  obsProcessingMethod: StationObsProcessingMethodEnum;

  //---------------
  @Column({ name: "observation_environment_id", type: 'int', nullable: true })
  obsEnvironmentId: number | null;

  @ManyToOne(() => StationObsEnvironmentEntity, {
    nullable: true,
    onDelete: "SET NULL",
    // Note, by default we expect most operations that relate to retrieving the elements to require the type as well.
    // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
    // For operations that don't need the type loaded eagerly, just set it to false using typeorm when quering the entities
    eager: true,
  })
  @JoinColumn({ name: "observation_environment_id" })
  obsEnvironment: StationObsEnvironmentEntity | null;
  //---------------

  //---------------
  @Column({ name: "observation_focus_id", type: 'int', nullable: true })
  obsFocusId: number | null;

  @ManyToOne(() => StationObsFocusEntity, {
    nullable: true,
    onDelete: "SET NULL",
    // Note, by default we expect most operations that relate to retrieving the elements to require the type as well.
    // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
    // For operations that don't need the type loaded eagerly, just set it to false using typeorm when quering the entities
    eager: true,
  })
  @JoinColumn({ name: "observation_focus_id" })
  obsFocus: StationObsFocusEntity | null;
  //---------------

  // TODO. Relationship and the organisations table
  @Column({ name: "organisation_id", type: "int", nullable: true })
  organisationId: number | null; // name of organisation that owns the station.

  // TODO. Relationship and the affilition table
  @Column({ name: "network_affiliation_id", type: 'int', nullable: true })
  networkAffiliationId: number | null; // network affiliation that the station shares data with.

  @Column({ name: "wmo_id", type: 'varchar', nullable: true, unique: true })
  wmoId: string | null;

  @Column({ name: "wigos_id", type: 'varchar', nullable: true, unique: true })
  wigosId: string | null;

  @Column({ name: "icao_id", type: 'varchar', nullable: true, unique: true })
  icaoId: string | null;

  // TODO
  //@Column({ name: "time_zone", type: 'int', nullable: true })
  //@Index()
  //timeZone: number | null;

  @Column({ name: "status", type: "enum", enum: StationStatusEnum, nullable: true })
  @Index()
  status: StationStatusEnum | null;

  @Column({ name: "date_established", type: "timestamptz", nullable: true })
  @Index()
  dateEstablished: Date | null;

  @Column({ name: "date_closed", type: 'timestamptz', nullable: true })
  @Index()
  dateClosed: Date | null;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: StationLogVo[] | null;

}

export interface StationLogVo extends BaseLogVo {
  name: string;
  description: string;
  comment: string | null;
  // TODO. Other properties as well
}
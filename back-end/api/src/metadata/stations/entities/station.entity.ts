import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Point, PrimaryColumn } from "typeorm";
import { StationStatusEnum } from "../enums/station-status.enum";
import { StationObsProcessingMethodEnum as StationObsProcessingMethodEnum } from "../enums/station-obs-processing-method.enum";
import { StationObservationFocusEntity as StationObsFocusEntity } from "./station-observation-focus.entity";
import { StationObservationEnvironmentEntity } from "./station-observation-environment.entity";
import { OrganisationEntity } from "./organisation.entity";

@Entity("stations")
@Check("CHK_stations_id_not_empty", `"id" <> ''`) // Not empty CHECK constraint
@Check("CHK_stations_name_not_empty", `"name" <> ''`)// Not empty CHECK constraint
export class StationEntity extends AppBaseEntity {
  @PrimaryColumn({ name: "id", type: 'varchar' })
  id: string;

  @Column({ name: "name", type: 'varchar' })
  name: string;

  @Column({ name: "description", type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: "observation_processing_method", type: "enum", enum: StationObsProcessingMethodEnum })
  @Index()
  obsProcessingMethod: StationObsProcessingMethodEnum;

  // TODO. Create a separate table for station history. Important for tracking station movements
  // Reason as to why station location table is important when it comes to moving stations like aircrafts.
  // Note using the location, we can determine all regions, drainage basins and other spatial features that the station belongs. So no need for foreign keys!
  @Column({ name: "location", type: 'geometry', spatialFeatureType: 'Point', nullable: true })
  @Index({ spatial: true })
  location: Point | null;

  @Column({ name: "elevation", type: 'float', nullable: true })
  @Index()
  elevation: number | null;  // Elevation of station above mean sea level.

  //---------------
  @Column({ name: "observation_environment_id", type: 'int', nullable: true })
  obsEnvironmentId: number | null;

  @ManyToOne(() => StationObservationEnvironmentEntity, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "observation_environment_id" })
  obsEnvironment: StationObservationEnvironmentEntity | null;
  //---------------

  //---------------
  @Column({ name: "observation_focus_id", type: 'int', nullable: true })
  obsFocusId: number | null;

  @ManyToOne(() => StationObsFocusEntity, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "observation_focus_id" })
  obsFocus: StationObsFocusEntity | null;
  //---------------

  //---------------
  @Column({ name: "organisation_id", type: "int", nullable: true })
  organisationId: number | null; // name of organisation that owns the station.

  @ManyToOne(() => OrganisationEntity, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "organisation_id" })
  organisation: OrganisationEntity | null;
  //---------------

  @Column({ name: "wmo_id", type: 'varchar', nullable: true, unique: true })
  wmoId: string | null;

  @Column({ name: "wigos_id", type: 'varchar', nullable: true, unique: true })
  wigosId: string | null;

  @Column({ name: "icao_id", type: 'varchar', nullable: true, unique: true })
  icaoId: string | null;

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
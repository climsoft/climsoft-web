import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Point, PrimaryColumn } from "typeorm";
import { StationStatusEnum } from "../enums/station-status.enum";
import { StationObservationMethodEnum } from "../enums/station-observation-method.enum";
import { StationObservationFocusEntity } from "./station-observation-focus.entity";
import { StationObsEnvironmentEntity } from "./station-observation-environment.entity";
import { PointDTO } from "../dtos/point.dto";
import { PointColumnTransformer } from "src/shared/column-transformers/point-transformer";
import { PointColumnModel } from "src/shared/column-transformers/point-column.model";

@Entity("stations")
export class StationEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'point', transformer: new PointColumnTransformer()  })
  //@Index({ spatial: true }) // TODO, index this after the move to POSTGIS
  location: PointColumnModel;

  @Column({ type: 'float' })
  elevation: number;  // Elevation of station above mean sea level.

  @Column({ type: "enum", enum: StationObservationMethodEnum, name: "station_observation_method", nullable: true })
  @Index()
  stationObsMethod: StationObservationMethodEnum;

  //---------------
  @Column({ type: 'int', name: "station_obsevation_environment_id", nullable: true })
  stationObsEnvironmentId: number | null;

  @ManyToOne(() => StationObsEnvironmentEntity, {
    nullable: true,
    onDelete: "SET NULL",
    // Note, by default we expect most operations that relate to retrieving the elements to require the type as well.
    // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
    // For operations that don't need the type loaded eagerly, just set it to false using typeorm when quering the entities
    eager: true,
  })
  @JoinColumn({ name: "station_obsevation_environment_id" })
  stationObsEnvironment: StationObsEnvironmentEntity | null;
  //---------------

  //---------------
  @Column({ type: 'int', name: "station_obsevation_focus_id", nullable: true })
  stationObsFocusId: number | null;

  @ManyToOne(() => StationObservationFocusEntity, {
    nullable: true,
    onDelete: "SET NULL",
    // Note, by default we expect most operations that relate to retrieving the elements to require the type as well.
    // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
    // For operations that don't need the type loaded eagerly, just set it to false using typeorm when quering the entities
    eager: true,
  })
  @JoinColumn({ name: "station_obsevation_focus_id" })
  stationObsFocus: StationObservationFocusEntity | null;
  //---------------

  //TODO. implement based on koppen climate classification.
  @Column({ type: "int", name: "climate_zone_id", nullable: true })
  climateZoneId: number | null;

  //TODO. Implement after creating the models relevant to drainage basin
  @Column({ type: "int", name: "drainage_basin_id", nullable: true })
  drainageBasinId: number | null;

  // TODO
  @Column({ type: "int", name: "administrative_unit_id", nullable: true })
  administrativeUnitId: number | null; //province, county, district. Lowest form of self government

  // TODO
  @Column({ type: "int", name: "organisation_id", nullable: true })
  organisationId: number | null; // name of organisation that owns the station.

  // TODO
  @Column({ type: 'int', name: "network_affiliation_id", nullable: true })
  networkAffiliationId: number | null; // network affiliation that the station shares data with

  @Column({ type: 'varchar', nullable: true, unique: true })
  wmoId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  wigosId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  icaoId: string | null;

  // TODO
  @Column({ type: 'varchar', name: "time_zone", nullable: true })
  @Index()
  timeZone: string | null;

  @Column({ type: "enum", enum: StationStatusEnum, nullable: true })
  @Index()
  status: StationStatusEnum | null;

  @Column({ type: "timestamptz", name: "date_established", nullable: true })
  @Index()
  dateEstablished: Date | null;

  @Column({ type: 'timestamptz', name: "date_closed", nullable: true })
  @Index()
  dateClosed: Date | null;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  log: StationLogVo[] | null;

}

export interface StationLogVo extends BaseLogVo {
  name: string;
  description: string;
  comment: string | null;
  // TODO. Other properties as well
}
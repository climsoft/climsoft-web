import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationStatusEnum } from "../enums/station-status.enum";
import { StationObservationMethodEnum } from "../enums/station-observation-method.enum";
import { StationObservationFocusEntity } from "./station-observation-focus.entity";
import { StationObservationEnvironmentEntity } from "./station-observation-environment.entity";

@Entity("stations")
export class StationEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  location: string | null; //a GeoJSON. Polygon feature
 
  @Column({ type: 'float', nullable: true })
  elevation: number | null;  // Elevation of station above mean sea level.

  @Column({ type: "enum", enum: StationObservationMethodEnum, name: "station_observation_method", nullable: true })
  @Index()
  stationObservationMethod: StationObservationMethodEnum | null;

  //---------------
  @Column({ type: 'int', name: "station_obsevation_environment_id" })
  stationObsevationEnvironmentId: number | null;

  @ManyToOne(() => StationObservationEnvironmentEntity, { nullable: true, onDelete: "SET NULL" }) // This makes the relationship itself nullable
  @JoinColumn({ name: "station_obsevation_environment_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
  stationObsevationEnvironment: StationObservationEnvironmentEntity | null;
 //---------------

  //---------------
  @Column({ type: 'int', name: "station_obsevation_focus_id", nullable: true })
  stationObservationFocusId: number | null;

  @ManyToOne(() => StationObservationFocusEntity, { nullable: true, onDelete: "SET NULL" }) // This makes the relationship itself nullable
  @JoinColumn({ name: "station_obsevation_focus_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
  stationObsevationFocus: StationObservationFocusEntity | null;
 //---------------

  //TODO. implement based on koppen climate classification.
  @Column({ type: "int", name: "climate_zone_id", nullable: true })
  climateZoneId: number | null; 

  //TODO. Implement after creating the models relevant to 
  // drainage basin, water bodies and other features.
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
  
  @Column({ type: 'varchar', nullable: true })
  wmoId: string | null;

  @Column({ type: 'varchar', nullable: true })
  wigosId: string | null;

  @Column({ type: 'varchar', nullable: true })
  icaoId: string | null;

  // TODO
  @Column({ type: 'varchar', name: "time_zone", nullable: true })
  timeZone: string | null;

  @Column({ type: "enum", enum: StationStatusEnum, nullable: true })
  @Index()
  status: StationStatusEnum | null;

  @Column({ type: "timestamptz", name: "date_established", nullable: true })
  dateEstablished: Date | null;

  @Column({ type: 'timestamptz', name: "date_closed", nullable: true })
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
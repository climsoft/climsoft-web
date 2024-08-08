import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationStatusEnum } from "../../enums/station-status.enum";
import { StationObsProcessingMethodEnum as StationObsProcessingMethodEnum } from "../../enums/station-obs-processing-method.enum";
import { StationObservationFocusEntity as StationObsFocusEntity } from "./station-observation-focus.entity";
import { StationObsEnvironmentEntity } from "./station-observation-environment.entity";  
import { PointDTO } from "src/shared/dtos/point.dto";
import { PointColumnTransformer } from "src/shared/column-transformers/point-transformer";

@Entity("stations")
export class StationEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  // TODO. Create a separate table for station history. Important for tracking station movements
  // Reason as to why station location table is important when it comes to moving stations like aircrafts.
  // Note using the location, we can determine all regions, drainage basins and other spatial features that the station belongs. So no need for foreign keys!
  @Column({ type: 'point', transformer: new PointColumnTransformer() })  
  location: PointDTO; //@Index({ spatial: true }) // TODO, later it may be important to index this after the move to POSTGIS, when dealing with many stations 

  @Column({ type: 'float' })
  elevation: number;  // Elevation of station above mean sea level.

  @Column({ type: "enum", enum: StationObsProcessingMethodEnum, name: "observation_processing_method", nullable: true })
  @Index()
  obsProcessingMethod: StationObsProcessingMethodEnum;

  //---------------
  @Column({ type: 'int', name: "observation_environment_id", nullable: true })
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
  @Column({ type: 'int', name: "observation_focus_id", nullable: true })
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

   //TODO. implement based on koppen climate classification.
   @Column({ type: "int", name: "climate_zone_id", nullable: true })
   climateZoneId: number | null;

  // TODO
  @Column({ type: "int", name: "organisation_id", nullable: true })
  organisationId: number | null; // name of organisation that owns the station.

  // TODO
  @Column({ type: 'int', name: "network_affiliation_id", nullable: true })
  networkAffiliationId: number | null; // network affiliation that the station shares data with.

  @Column({ type: 'varchar', nullable: true, unique: true })
  wmoId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  wigosId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  icaoId: string | null;

  // TODO
  @Column({ type: 'int', name: "time_zone", nullable: true })
  @Index()
  timeZone: number | null;

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
import { BaseEntity } from "src/shared/entity/base-entity";
import { Entity, PrimaryColumn } from "typeorm";

@Entity("station_forms")
export class StationFormEntity extends BaseEntity {

    @PrimaryColumn({ type: "varchar" })
    stationId: string;

    @PrimaryColumn({ type: "int" })
    sourceId: number;
  
}

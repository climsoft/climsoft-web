import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationEntity } from "./station.entity";  
import { SourceEntity } from "src/metadata/sources/entities/source.entity";

@Entity("station_forms")
export class StationFormEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "varchar" ,name: "station_id"})
    stationId: string;

    @PrimaryColumn({ type: "int", name:"source_id" })
    sourceId: number;

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    // ManyToOne relationship with SourceEntity
    @ManyToOne(() => SourceEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "source_id" })
    source: SourceEntity;
  
}

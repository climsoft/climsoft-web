import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementEntity } from "../../elements/entities/element.entity"; 
import { InstrumentEntity } from "../../instruments/entities/instrument.entity";
import { StationEntity } from "./station.entity";

@Entity("station_elements")
export class StationElementEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "varchar", name: "station_id" })
    @Index()
    stationId: string;

    @PrimaryColumn({ type: "int", name: "element_id" })
    @Index()
    elementId: number;

    @Column({ type: "int", name: "instrument_id", nullable: true })
    @Index()
    instrumentId: number | null;

    @Column({ type: "jsonb", name: "month_limits", nullable: true })
    monthLimits: StationElementLimit[] | null;

    @Column({ name: "comment", type: 'varchar', nullable: true })
    comment: string | null;

    @Column({ type: "jsonb", nullable: true })
    log: StationElementEntityLogVo[] | null;

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    // ManyToOne relationship with ElementEntity
    @ManyToOne(() => ElementEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "element_id" })
    element: ElementEntity;

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "instrument_id" })
    instrument: InstrumentEntity;

}

export interface StationElementLimit {
    monthId: number;
    lowerLimit: number | null;
    upperLimit: number | null;
    comment: string | null;
}

export interface StationElementEntityLogVo extends BaseLogVo {
    instrumentId: number | null;
    monthLimits: StationElementLimit[] | null;
}
import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { StationEntity } from "./station.entity";
import { InstrumentEntity } from "./instrument.entity";

@Entity("station_elements")
export class StationElementEntity extends BaseEntity {

    @PrimaryColumn({ type: "varchar", name: "station_id" })
    stationId: string;

    @PrimaryColumn({ type: "int", name: "element_id" })
    elementId: number;

    @Column({ type: "int", name: "instrument_id", nullable: true })
    instrumentId: number | null;

    @Column({ type: "jsonb", name: "month_limits", nullable: true })
    monthLimits: StationElementLimit[] | null;

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
    @ManyToOne(() => StationEntity, { nullable: true, onDelete: "SET NULL" })
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
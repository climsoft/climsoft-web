import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_elements")
export class StationElementEntity extends BaseEntity {

    @PrimaryColumn({ type: "varchar" })
    stationId: string;

    @PrimaryColumn({ type: "int" })
    elementId: number;

    @Column({ type: "int",name: "instrument_id", nullable: true })
    instrumentId: number | null;

    @Column({ type: "jsonb",name: "month_limits", nullable: true })
    monthLimits: StationElementLimit[] | null;   

    @Column({ type: "jsonb", nullable: true })
    log: StationElementEntityLogVo[] | null;
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
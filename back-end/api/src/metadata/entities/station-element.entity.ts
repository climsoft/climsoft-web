import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_elements")
export class StationElementEntity {

    @PrimaryColumn({ type: "varchar" })
    stationId: string;

    @PrimaryColumn({ type: "int" })
    elementId: number;

    @Column({ type: "jsonb", nullable: true })
    limits: Limit | null;

    @Column({ type: "varchar", name:"entry_user_id" })
    entryUserId: string;

    @Column({ type: "timestamptz", name: "entry_date_time", transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: "jsonb", nullable: true })
    log: StationElementEntityLogVo | null;
}

export interface Limit{
    monthId: number;
    lowerLimit: number | null; 
    upperLimit: number | null;
    comment: string | null;
}

export interface StationElementEntityLogVo {
    limits: Limit | null;
    comment: string | null;
    entryUserId: string;
    entryDateTime: string;
}
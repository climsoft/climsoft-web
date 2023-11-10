import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_station_element_limits")
export class StationElementLimitEntity {

    @PrimaryColumn({ type: 'varchar' })
    stationId: string;

    @PrimaryColumn({ type: 'int' })
    elementId: number;

    @PrimaryColumn({ type: 'int' })
    monthId: number;

    @Column({ type: 'int', nullable: true })
    lowerLimit: number | null;

    @Column({ type: 'int', nullable: true })
    upperLimit: number | null;

    @Column({ type: 'varchar', nullable: true })
    comment: string | null;

    @Column({ type: 'varchar' })
    entryUserId: string;

    @Column({ type: 'datetime', transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: 'json', nullable: true })
    log: string | null;
}

export interface StationElementLimitEntityLogVo {
    lowerLimit: number | null;
    upperLimit: number | null;
    comment: string | null;
    entryUserId: string;
    entryDateTime: string;
}
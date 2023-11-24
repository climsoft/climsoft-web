import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_instruments")
export class InstrumentEntity {

    @PrimaryColumn({ type: 'varchar' })
    id: string; // can be the instrument serial number

    @Column({ type: 'int' })
    instrumentTypeId: number;

    @Column({ type: 'varchar', nullable: true })
    location: string; //GeoJSON. A point

    @Column({ type: 'varchar', nullable: true })
    status: string;

    @Column({ type: 'datetime', transformer: new DateTimeColumn() })
    statusChangeDate: string | null;

    @Column({ type: 'varchar', nullable: true })
    lastMaintenanceDate: string;

    @Column({ type: 'varchar', nullable: true })
    comment: string | null;
  
    @Column({ type: 'int' })
    entryUser: number;

    @Column({ type: 'datetime', transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: 'json', nullable: true })
    log: string | null;

}
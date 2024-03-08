import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("instruments")
export class InstrumentEntity {

    @PrimaryGeneratedColumn({ type: "int" })
    id: number; 

    @Column({ type: "varchar", name:"serial_number" })
    serialNumber: string;

    @Column({ type: "int", name:"instrument_type_id" })
    instrumentTypeId: number;

    @Column({ type: "varchar", nullable: true })
    stationId: string; 

    @Column({ type: "varchar", nullable: true })
    status: string;

    @Column({ type: "timestamptz",name: "status_change_date", transformer: new DateTimeColumn() })
    statusChangeDate: string | null;

    @Column({ type: "varchar",name: "last_maintenance_date", nullable: true })
    lastMaintenanceDate: string;

    @Column({ type: "varchar", nullable: true })
    comment: string | null;
  
    @Column({ type: "int",name: "entry_user_id" })
    entryUserId: number;

    @Column({ type: "timestamptz", name: "entry_date_time", transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: "jsonb", nullable: true })
    log: string | null;

}

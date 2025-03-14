import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { InstrumentTypeEntity } from "./instrument-type.entity";
import { AppBaseEntity } from "src/shared/entity/app-base-entity";

// TODO. Add this later after careful evaluation
@Entity("instruments")
export class InstrumentEntity extends AppBaseEntity {

    @PrimaryGeneratedColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar", name: "serial_number" })
    serialNumber: string;

    @Column({ type: "int", name: "instrument_type_id" })
    @Index()
    instrumentTypeId: number;

    // ManyToOne relationship with InstrumentTypeEntity
    @ManyToOne(() => InstrumentTypeEntity, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "instrument_type_id" })
    instrumentType: InstrumentTypeEntity;

    @Column({ type: "varchar" })
    stationId: string;

    @Column({ type: "int"})
    elementId: number;

    @Column({ type: "varchar", nullable: true })
    status: string;

    @Column({ type: "timestamptz", name: "status_change_date", nullable: true })
    statusChangeDate: string | null;

    @Column({ type: "varchar", name: "last_maintenance_date", nullable: true })
    lastMaintenanceDate: string;

    @Column({ type: "varchar", nullable: true })
    comment: string | null;

    @Column({ type: "jsonb", nullable: true })
    log: string | null;

}

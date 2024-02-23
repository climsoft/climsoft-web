import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_instrument_types")
export class InstrumentTypeEntity {

    @PrimaryColumn({ type: 'varchar' })
    id: string;

    @Column({ type: 'varchar' })
    name: number;

    @Column({ type: 'varchar' })
    description: string;

    @Column({ type: 'int' })
    elementTypeId: number;//The element it measures

    @Column({ type: 'varchar', nullable: true })
    model: string | null;

    @Column({ type: 'varchar', nullable: true })
    manufacturer: string | null;

    @Column({ type: 'float', nullable: true })
    elevation: number | null; // height of installation

    @Column({ type: 'int', nullable: true })
    lowerLimit: number | null;

    @Column({ type: 'int', nullable: true })
    upperLimit: number | null;

    @Column({ type: 'float', nullable: true })
    absoluteUncertainty: number | null;

    @Column({ type: 'float', nullable: true })
    relativeUncertainty: number | null;

    @Column({ type: 'varchar', nullable: true })
    units: string | null;

    @Column({ type: 'varchar', nullable: true })
    observingMethod: string | null; //manual or automatic

    //@Column({ type: 'varchar' })
    //instrumentClass: string; //manual or automatic

    @Column({ type: 'varchar', nullable: true })
    firmWareVersion: string | null;

    @Column({ type: 'float', nullable: true })
    maintenancePeriod: number | null;

    @Column({ type: 'varchar', nullable: true })
    imageFileName: string | null; //file name of image

    @Column({ type: 'varchar', nullable: true })
    comment: string | null;

    @Column({ type: 'int' })
    entryUser: number;

    @Column({ type: 'timestamptz', transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: 'json', nullable: true })
    log: string | null;

}
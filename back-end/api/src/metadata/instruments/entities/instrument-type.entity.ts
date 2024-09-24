import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("instrument_types")
export class InstrumentTypeEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "int" })
    id: string;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ type: "int" })
    elementTypeId: number; // The element it measures

    @Column({ type: "varchar", nullable: true })
    model: string | null;

    @Column({ type: "varchar", nullable: true })
    manufacturer: string | null;

    @Column({ type: "float", nullable: true })
    elevation: number | null; // height of installation

    @Column({ type: "int", nullable: true })
    lowerLimit: number | null;

    @Column({ type: "int", nullable: true })
    upperLimit: number | null;

    @Column({ type: "float", nullable: true })
    absoluteUncertainty: number | null;

    @Column({ type: "float", nullable: true })
    relativeUncertainty: number | null;

    @Column({ type: "varchar", nullable: true })
    units: string | null;

    @Column({ type: "varchar", name: "observing_method", nullable: true })
    observingMethod: string | null; // manual or automatic

    @Column({ type: "varchar", name: "firm_ware_version", nullable: true })
    firmWareVersion: string | null;

    @Column({ type: "float", name: "maintenance_period", nullable: true })
    maintenancePeriod: number | null;

    @Column({ type: "varchar", name: "image_file_name", nullable: true })
    imageFileName: string | null; // file name of image

    @Column({ type: "varchar", nullable: true })
    comment: string | null;

    @Column({ type: "json", nullable: true })
    log: string | null;

}

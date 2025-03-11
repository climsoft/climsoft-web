import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { observingMethodEnum } from "./observing-method.enum";
import { ElementTypeEntity } from "src/metadata/elements/entities/element-type.entity";

@Entity("instrument_types")
export class InstrumentTypeEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "int" })
    id: string;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ name: 'element_type_id', type: "int" })
    elementTypeId: number; // The element it measures

    @ManyToOne(() => ElementTypeEntity, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "element_type_id" })
    elementType: ElementTypeEntity;

    @Column({ type: "varchar", nullable: true })
    model: string | null;

    @Column({ type: "varchar", nullable: true })
    manufacturer: string | null;

    @Column({ type: "float", nullable: true })
    elevation: number | null; // height of installation

    @Column({ name: 'lower_limit', type: "int", nullable: true })
    lowerLimit: number | null;

    @Column({ name: 'upper_limit', type: "int", nullable: true })
    upperLimit: number | null;

    @Column({ name: 'absolute_uncertainty', type: "float", nullable: true })
    absoluteUncertainty: number | null;

    @Column({ name: 'relative_uncertainty', type: "float", nullable: true })
    relativeUncertainty: number | null;

    @Column({ type: "varchar", nullable: true })
    units: string | null;

    @Column({ name: "observing_method", type: "enum", enum: observingMethodEnum, nullable: true })
    observingMethod: string | null; // manual or automatic

    @Column({ type: "varchar", name: "firm_ware_version", nullable: true })
    firmWareVersion: string | null;

    @Column({ type: "float", name: "maintenance_interval", nullable: true })
    maintenanceInterval: number | null;

    @Column({ type: "varchar", name: "image_file_name", nullable: true })
    imageFileName: string | null; // file name of image

    @Column({ type: "varchar", nullable: true })
    comment: string | null;

    @Column({ type: "json", nullable: true })
    log: string | null;

}


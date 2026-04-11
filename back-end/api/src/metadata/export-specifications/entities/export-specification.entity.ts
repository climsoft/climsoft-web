import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { ExportTypeEnum } from "../enums/export-type.enum";
import { ExportParameters } from "../dtos/create-export-specification.dto";
import { AdapterSpecificationEntity } from "src/metadata/adapters/entities/adapter-specification.entity";

@Entity('export_specifications') // TODO. Rename to export_specifications
@Check("CHK_export_specifications_name_not_empty", `"name" <> ''`) // TODO Rename this too
export class ExportSpecificationEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id!: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name!: string;

    @Column({ name: "description", type: "varchar" })
    description!: string;

    @Column({ name: "export_type", type: "enum", enum: ExportTypeEnum })
    @Index()
    exportType!: ExportTypeEnum;

    @Column({ name: "parameters", type: "jsonb" })
    parameters!: ExportParameters;

    @Column({ name: "order_number", type: "int", nullable: true })
    @Index()
    orderNumber!: number | null;

    @Column({ type: "boolean", default: false })
    @Index()
    disabled!: boolean;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment!: string | null;

    /**
     * Optional FK to a post-export adapter. When set, the adapter is invoked
     * after the existing export pipeline produces its file — the adapter's
     * output replaces the file the user downloads. ON DELETE SET NULL so
     * removing an adapter unwires this reference instead of cascade-deleting
     * the export specification.
     */
    @Column({ name: "export_adapter_id", type: "int", nullable: true })
    exportAdapterId!: number | null;

    @ManyToOne(() => AdapterSpecificationEntity, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "export_adapter_id" })
    exportAdapter!: AdapterSpecificationEntity | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log!: BaseLogVo[] | null;
}



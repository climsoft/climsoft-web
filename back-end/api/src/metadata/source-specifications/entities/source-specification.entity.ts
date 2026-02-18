import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { SourceTypeEnum } from "src/metadata/source-specifications/enums/source-type.enum";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { SourceParameters } from "../dtos/create-source-specification.dto";

@Entity("source_templates") // TODO. change to source_specification later
@Check("CHK_source_templates_name_not_empty", `"name" <> ''`)// TODO. rename this too
export class SourceSpecificationEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name: string;

    @Column({ name: "description", type: "varchar", nullable: true })
    description: string;

    @Column({ name: "source_type", type: "enum", enum: SourceTypeEnum })
    @Index()
    sourceType: SourceTypeEnum;

    @Column({ name: "utc_offset", type: "int" })
    utcOffset: number;

    @Column({ name: "allow_missing_value", type: "boolean", default: false })
    allowMissingValue: boolean;

    @Column({ name: "scale_values", type: "boolean", default: false })
    scaleValues: boolean;

    @Column({ name: "sample_file_name", type: "varchar", nullable: true })
    sampleFileName: string | null;

    @Column({ name: "parameters", type: "jsonb" })
    parameters: SourceParameters;

    @Column({ name: "order_number", type: "int", nullable: true })
    @Index()
    orderNumber: number | null;

    @Column({ type: "boolean", default: false })
    disabled: boolean;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}



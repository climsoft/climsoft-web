import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { SourceTypeEnum } from "src/metadata/source-templates/enums/source-type.enum";
import { SourceParametersValidity } from "../dtos/create-update-source.dto";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";

@Entity("source_templates")
@Check("CHK_source_templates_name_not_empty", `"name" <> ''`)
export class SourceTemplateEntity extends AppBaseEntity {
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

    @Column({ name: "allow_missing_value", type: "boolean" })
    allowMissingValue: boolean;

    @Column({ name: "scale_values", type: "boolean" })
    scaleValues: boolean;

    @Column({ name: "sample_image", type: "varchar", nullable: true })
    sampleImage: string;

    @Column({ name: "parameters", type: "jsonb" })
    parameters: SourceParametersValidity;

    @Column({ name: "order_number", type: "int", nullable: true })
    orderNumber: number | null;

    @Column({ type: "boolean", default: false })
    disabled: boolean;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}



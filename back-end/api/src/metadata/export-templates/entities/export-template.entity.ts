import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { ExportTemplateParametersDto } from "../dtos/export-template-paramers.dto";
import { ExportTypeEnum } from "../enums/export-type.enum";

@Entity("export_templates")
@Check("CHK_export_templates_name_not_empty", `"name" <> ''`)
@Check("CHK_export_templates_description_not_empty", `"description" <> ''`)
export class ExportTemplateEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name: string;

    @Column({ name: "description", type: "varchar" })
    description: string;

    @Column({ name: "export_type", type: "enum", enum: ExportTypeEnum })
    @Index()
    exportType: ExportTypeEnum;

    @Column({ name: "parameters", type: "jsonb" })
    parameters: ExportTemplateParametersDto; 

    @Column({ type: "boolean", default: false })
    @Index()
    disabled: boolean;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}



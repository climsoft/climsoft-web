import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity"; 
import { ExportTemplateParametersDto } from "../dtos/export-template-paramers.dto";

@Entity("export_templates")
@Check("CHK_export_templates_name_not_empty", `"name" <> ''`)
export class ExportTemplateEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name: string;

    @Column({ name: "description", type: "varchar" })
    description: string;

    @Column({ name: "utc_offset", type: "int" })
    utcOffset: number;

    @Column({ name: "parameters", type: "jsonb" })
    parameters: ExportTemplateParametersDto;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}



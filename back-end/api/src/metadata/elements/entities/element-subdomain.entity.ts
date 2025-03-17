import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ElementDomainEnum } from "../dtos/elements/element-domain.enum";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";

@Entity("element_subdomains")
@Check("CHK_element_subdomain_name_not_empty", `"name" <> ''`)
export class ElementSubdomainEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ type: "int" })
    id: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name: string;

    @Column({ type: "varchar", nullable: true })
    description: string | null;

    @Column({ name: "domain", type: "enum", enum: ElementDomainEnum })
    @Index()
    domain: ElementDomainEnum;

    @Column({ name: "comment", type: 'varchar', nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}

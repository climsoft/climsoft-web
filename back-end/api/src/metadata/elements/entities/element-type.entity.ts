import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ElementSubdomainEntity } from "./element-subdomain.entity";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";

@Entity("element_types")
@Check("CHK_element_type_name_not_empty", `"name" <> ''`)
export class ElementTypeEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar", nullable: true })
    description: string | null;

    @Column({ type: "int", name: "subdomain_id" })
    @Index()
    subdomainId: number;

    // ManyToOne relationship with ElementSubdomainEntity
    @ManyToOne(() => ElementSubdomainEntity, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "subdomain_id" })
    elementSubdomain: ElementSubdomainEntity;

    @Column({ name: "comment", type: 'varchar', nullable: true })
    comment: string | null;

    @Column({ name: 'log', type: 'jsonb', nullable: true })
    log: BaseLogVo[] | null;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementDomainEntity } from "./element-domain.entity";

@Entity("element_subdomains")
export class ElementSubdomainEntity {
    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ type: "int", name: "domain_id" })
    domainId: number;

    // ManyToOne relationship with ElementDomainEntity
    @ManyToOne(() => ElementSubdomainEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "domain_id" })
    elementType: ElementDomainEntity;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementSubdomainEntity } from "./element-subdomain.entity";
import { AppBaseEntity } from "src/shared/entity/app-base-entity";

@Entity("element_types")
export class ElementTypeEntity extends AppBaseEntity {
    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ type: "int", name: "subdomain_id" })
    subdomainId: number;

    // ManyToOne relationship with ElementSubdomainEntity
    @ManyToOne(() => ElementSubdomainEntity, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "subdomain_id" })
    elementSubdomain: ElementSubdomainEntity;
}

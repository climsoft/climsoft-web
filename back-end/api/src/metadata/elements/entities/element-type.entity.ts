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
    @ManyToOne(() => ElementSubdomainEntity, {
        onDelete: "CASCADE",

        // Note, by default we expect most operations that relate to retrieving the element types to require the subdomain as well.
        // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
        // For operations that don't need the subdomain loaded eagerly, just set it to false using typeorm when quering the entities
        eager: true,
    })
    @JoinColumn({ name: "subdomain_id" })
    elementSubdomain: ElementSubdomainEntity;
}

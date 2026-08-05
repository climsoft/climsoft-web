import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("climate_products")
@Check("CHK_climate_products_name_not_empty", `"name" <> ''`)
@Check("CHK_climate_products_uuid_not_empty", `"superset_uuid" <> ''`)
export class ClimateProductEntity extends AppBaseEntity {

    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id!: number;

    @Column({ name: "system_key", type: "varchar", unique: true, nullable: true })
    systemKey!: string | null;

    @Column({ name: "superset_uuid", type: "varchar" })
    supersetUuid!: string;

    @Column({ name: "name", type: "varchar" })
    name!: string;

    @Column({ name: "description", type: "varchar", nullable: true })
    description!: string | null;

    @Column({ name: "category", type: "varchar", nullable: true })
    category!: string | null;

    @Column({ name: "disabled", type: "boolean", default: false })
    disabled!: boolean;

    @Column({ name: "log", type: "jsonb", nullable: true })
    log!: ClimateProductLogVo[] | null;

}

export interface ClimateProductLogVo extends BaseLogVo {
    supersetUuid: string;
    name: string;
    description: string | null;
    category: string | null;
    disabled: boolean;
}

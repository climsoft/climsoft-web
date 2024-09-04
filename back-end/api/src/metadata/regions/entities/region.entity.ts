import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, Index, PrimaryColumn } from "typeorm"; 
import { RegionTypeEnum } from "../enums/region-types.enum";

@Entity("regions")
export class RegionsEntity extends BaseEntity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  // TODO. Later code a transformer to tansform this
  @Column({ type: 'polygon'})  
  location: string; //@Index({ spatial: true }) // TODO, index this after the move to POSTGIS

  @Column({ type: "enum", enum: RegionTypeEnum, nullable: true })
  @Index()
  typeId: number;

  @Column({ type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}


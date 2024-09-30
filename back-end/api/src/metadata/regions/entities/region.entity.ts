import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, PrimaryColumn } from "typeorm"; 
import { RegionTypeEnum } from "../enums/region-types.enum";

@Entity("regions")
export class RegionsEntity extends AppBaseEntity {
  @PrimaryColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({  name: 'name', type: 'varchar', unique: true })
  name: string;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  // TODO. Later code a transformer to tansform this
  @Column({ name: 'location', type: 'polygon'})  
  location: string; //@Index({ spatial: true }) // TODO, index this after the move to POSTGIS

  @Column({ name: 'region_type', type: "enum", enum: RegionTypeEnum })
  @Index()
  regionType: RegionTypeEnum;

  @Column({ name: 'log',  type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}


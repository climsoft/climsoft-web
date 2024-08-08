import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm"; 

@Entity("drainage_basins")
export class DrainageBasinEntity extends BaseEntity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  // TODO. Later code a transformer to tansform this
  @Column({ type: 'polygon'})  
  location: string; //@Index({ spatial: true }) // TODO, index this after the move to POSTGIS

  @Column({ type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}


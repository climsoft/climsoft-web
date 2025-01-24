import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("database_versions")
export class DatabaseVersionEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number; // Required because of getting the last version entry (by ordering using id)

  @Column({ name: 'version', type: 'varchar', unique: true })
  version: string; 
} 


import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("database_versions")
export class DatabaseVersionEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'version', type: 'varchar' })
  version: string;
}


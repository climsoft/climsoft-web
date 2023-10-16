import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_elements")
export class ElementEntity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  abbreviation: string;

  @Column({ type: 'varchar' })
  description: string;
  
  @Column({ type: 'int' })
  typeId: number;

  @Column({ type: 'int' })
  lowerLimit: number;

  @Column({ type: 'int' })
  upperLimit: number;

  @Column({ type: 'float', default: 1 })
  entryScaleFactor: number;

  @Column()
  units: string;

}
import { type } from "os";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_elements")
export class ElementEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  abbreviation: string;

  @Column()
  description: string;

  @Column()
  lowerLimit: number;

  @Column()
  upperLimit: number;

  @Column( {type: 'float' , default: 1})
  entryScaleFactor: number;

  @Column()
  units: string;

}
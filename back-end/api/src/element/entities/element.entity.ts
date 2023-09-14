import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_elements")
export class ElementEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  abbreviation: string;

}
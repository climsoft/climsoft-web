import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_stations")
export class Station {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

}
import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
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

  @Column({ type: 'int', nullable: true })
  lowerLimit: number | null;

  @Column({ type: 'int', nullable: true })
  upperLimit: number | null;

  @Column({ type: 'float', nullable: true })
  entryScaleFactor: number | null;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar' })
  entryUserId: string;

  @Column({ type: 'datetime', transformer: new DateTimeColumn() })
  entryDateTime: string;

  @Column({ type: 'json', nullable: true })
  log: string | null;

}

export interface ElementLogVo {
  name: string;
  abbreviation: string;
  description: string;
  typeId: number;
  lowerLimit: number | null;
  upperLimit: number | null;
  entryScaleFactor: number | null;
  comment: string | null;
  entryUserId: string;
  entryDateTime: string;
}
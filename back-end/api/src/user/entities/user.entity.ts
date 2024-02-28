import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("users")
export class UserEntity {

  @PrimaryColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar" })
  phone: string;

  @Column({ type: "varchar" })
  password: string;

  @Column({ type: "int", name: "role_id" })
  roleId: number;

  @Column({ type: "varchar", array: true, name: "authorised_station_ids", nullable: true })
  authorisedStationIds: string[] | null;

  @Column({ type: "jsonb", nullable: true })
  extraMetadata: string | null; //TODO. Structure will be determined later

  @Column({ type: "boolean", default: false })
  disabled: boolean;

  //for consistency in date time storage. This should be set at application level instead of relying on typeorm and database
  //for instance typeorm will set the field to microseconds with precision of 6 which breaks consistency with how we store date time in other areas.
  //we also need the transformer to yield consistent results
  //there could also be inconsistency if typeorm ended up using different timezone
  @Column({ type: 'timestamptz', name: "entry_date_time", transformer: new DateTimeColumn() })
  entryDateTime: string;

  //maps to observation log model
  @Column({ type: 'jsonb', nullable: true })
  log: UserLogVo[] | null;

}

export interface UserLogVo {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleId: number;
  authorisedStationIds: string[] | null;
  extraMetadata: string | null;
  disabled: boolean;
  entryDateTime: string;
}
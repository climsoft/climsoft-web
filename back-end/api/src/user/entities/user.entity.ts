import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { UserRoleEnum } from "../enums/user-roles.enum";

@Entity("users")
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", unique: true })
  phone: string;

  @Column({ type: "varchar" })
  password: string;

  @Column({ type: "enum", enum: UserRoleEnum})
  role: UserRoleEnum;

  @Column({ type: "varchar", array: true, name: "authorised_station_ids", nullable: true })
  authorisedStationIds: string[] | null;

  @Column({ type: "jsonb", name: "extra_metadata", nullable: true })
  extraMetadata: string | null; //TODO. Structure will be determined later

  @Column({ type: "boolean", default: true })
  reset: boolean;

  @Column({ type: "boolean", default: false })
  disabled: boolean;

  //for consistency in date time storage. 
  // This should be set at application level instead of relying on typeorm and database
  //for instance typeorm will set the field to microseconds with precision of 6 which breaks consistency with how we store date time in other areas.
  //we also need the transformer to yield consistent results
  //there could also be inconsistency if typeorm ended up using different timezone
  @Column({ type: 'timestamptz', name: "entry_date_time" })
  entryDateTime: Date;

  //maps to observation log model
  @Column({ type: 'jsonb', nullable: true })
  log: UserLogVo[] | null;

}

// Note should not extend the BaseLogVo
export interface UserLogVo {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleId: UserRoleEnum;
  authorisedStationIds: string[] | null;
  extraMetadata: string | null;
  reset: boolean;
  disabled: boolean;
}
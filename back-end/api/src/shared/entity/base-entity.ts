import { Column, JoinColumn, ManyToOne } from "typeorm";
import { DateTimeColumn } from "../column-transformers/date-time-column.transformer";
import { UserEntity } from "src/user/entities/user.entity";

export abstract class BaseEntity {
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" }) // This makes the relationship itself nullable
    @JoinColumn({ name: "entry_user_id"}) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    entryUser: UserEntity | null;

    // Expose entry_user_id directly. Useful when updating the entry_user_id field without having to fetch from the database
    @Column({ type: "int", name: "entry_user_id", nullable: true })
    entryUserId: number | null;

    @Column({ type: "timestamptz", name: "entry_date_time", transformer: new DateTimeColumn() })
    entryDateTime: string;
}


export interface BaseLogVo {
    entryUserId: number | null;
    entryDateTime: string;
  }
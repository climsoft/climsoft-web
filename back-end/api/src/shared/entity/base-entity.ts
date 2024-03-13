import { Column, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";

export abstract class BaseEntity {
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" }) // This makes the relationship itself nullable
    @JoinColumn({ name: "entry_user_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    entryUser: UserEntity | null;

    // Expose entry_user_id directly. Useful when updating the entry_user_id field without having to fetch from the database
    @Column({ type: "int", name: "entry_user_id", nullable: true })
    entryUserId: number | null;

    //@UpdateDateColumn({ type: "timestamptz", name: "entry_date_time", default: () => "CURRENT_TIMESTAMP" }) // Left here for future rreference.
    // Note, we are not using the UpdateDateColumn() because we store this field as part of the log (in the log column) when saving an entity in the database.
    // So it's important to have this set at the application layer rather than the database. 

    //transformer: new DateTimeColumn()     
    @Column({ type: "timestamptz", name: "entry_date_time" })
    entryDateTime: Date;
}


export interface BaseLogVo {
    entryUserId: number | null;
    entryDateTime: Date;
}
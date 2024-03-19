import { Column, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";

export abstract class BaseEntity {
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" }) // This makes the relationship itself nullable
    @JoinColumn({ name: "entry_user_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    entryUser: UserEntity | null;

    // Expose entry_user_id directly. Useful when updating the entry_user_id field without having to fetch from the database
    @Column({ type: "int", name: "entry_user_id", nullable: true })
    entryUserId: number | null;

    //@UpdateDateColumn({ type: "timestamptz", name: "entry_date_time", default: () => "CURRENT_TIMESTAMP", transformer: new DateTimeColumn() }) // Left here for future reference.

    // Note, we are NOT using the UpdateDateColumn() because we store this field as part of the log (in the log column) when saving an entity in the database.
    // So it's important to have this set at the application layer rather than the database.  
    // Setting of default timestamp is useful for seeding migrations which populate the database with default values like elements.
    @Column({ type: "timestamptz", name: "entry_date_time",  default: () => "CURRENT_TIMESTAMP" })
    entryDateTime: Date;
}


export interface BaseLogVo {
    entryUserId: number | null;
    
    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string. 
    entryDateTime: string; 
}
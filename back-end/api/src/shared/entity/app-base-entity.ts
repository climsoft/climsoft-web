import { Column, Index, JoinColumn, ManyToOne, UpdateDateColumn } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";

export abstract class AppBaseEntity {
    // Expose entry_user_id directly. Useful when updating the entry_user_id field without having to fetch from the database
    @Column({ name: "entry_user_id", type: "int" })
    entryUserId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "RESTRICT" }) // This restricts deleting of users that have entered records
    @JoinColumn({ name: "entry_user_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    entryUser: UserEntity;

    // set default to make the entry date time to be optional
    // Setting of default timestamp is also useful for seeding migrations which populate the database with default values like elements.
    // TODO This can also be done through a before insert and update trigger functions. 
    // TODO. Evaluate doing at that level to enforce it at database level, for all tables that need it. 
    @UpdateDateColumn({ name: "entry_date_time", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    @Index()
    entryDateTime: Date;
}


export interface BaseLogVo {
    entryUserId: number;

    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string. 
    entryDateTime: string;
}
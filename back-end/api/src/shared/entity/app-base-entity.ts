import { Column, Index, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";

export abstract class AppBaseEntity {
    // Expose entry_user_id directly. Useful when updating the entry_user_id field without having to fetch from the database
    @Column({ name: "entry_user_id", type: "int" })
    entryUserId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "RESTRICT" }) // This restricts deleting of users that have entered records
    @JoinColumn({ name: "entry_user_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    entryUser: UserEntity;

    @Column({ name: "entry_date_time", type: 'timestamptz'})
    @Index()
    entryDateTime: Date;
}

/**
 * Note. The class uses snake case instead of camel case because snake case is preferable in SQL and at postgres level for storing and querying.
 * Most PostgreSQL GIN index-based filters (e.g. jsonb_path_ops) are simpler when using consistent lowercase/snake_case key names.
 */
export interface BaseLogVo {
    entryUserId: number; // TODO. Deprecate in preview 2 release

    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string. 
    entryDateTime: string;

    // TODO introduce snake case
}
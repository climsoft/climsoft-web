import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm"; 
import { UserEntity } from "src/user/entities/user.entity";
import { ExportEntity } from "./export.entity";

@Entity("export_audit_logs")
export class ExportAuditLogEntity {
    @PrimaryColumn({ name: "export_id", type: "int" })
    exportId: number;

    @ManyToOne(() => ExportEntity, { nullable: false, onDelete: "RESTRICT" }) // This restricts deleting of users that have entered records
    @JoinColumn({ name: "extends" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    export: ExportEntity;

    @PrimaryColumn({ name: "user_id", type: "int" })
    userId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "RESTRICT" }) // This restricts deleting of users that have entered records
    @JoinColumn({ name: "user_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    user: UserEntity;

    @PrimaryColumn({ name: "export_date_time", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    exportDateTime: Date;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;
}



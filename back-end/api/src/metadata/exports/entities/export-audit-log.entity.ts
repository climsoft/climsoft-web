import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";
import { ExportTemplateEntity } from "./export-template.entity";

@Entity("export_audit_logs")
export class ExportAuditLogEntity {
    @PrimaryColumn({ name: "export_id", type: "int" })
    @Index()
    exportId: number;

    @ManyToOne(() => ExportTemplateEntity, { nullable: false, onDelete: "RESTRICT" })
    @JoinColumn({ name: "export_id" }) // Configures the foreign key to be set to NULL upon deletion of the referenced User
    export: ExportTemplateEntity;

    @PrimaryColumn({ name: "user_id", type: "int" })
    @Index()
    userId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "RESTRICT" }) // This restricts deleting of users that have entered records
    @JoinColumn({ name: "user_id" })
    user: UserEntity;

    @PrimaryColumn({ name: "export_date_time", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    @Index()
    exportDateTime: Date;// Note, this will eventually be used to calculate end observation date when it comes to schedule exports resends

    @Column({ name: "record_num", type: "float" })
    RecordNum: number; // number of records exported

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment: string | null;
}



import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { AdapterLanguageEnum } from "../enums/adapter-language.enum";

/**
 * A user-uploaded script that translates a foreign file format to/from the
 * canonical format the existing import/export pipelines understand.
 *
 * The same adapter can be attached to an import source specification
 * (pre-import) or an export specification (post-export) — the adapter
 * itself is direction-agnostic. The FK columns on `source_specifications`
 * (`import_adapter_id`) and `export_specifications` (`export_adapter_id`)
 * encode which side the adapter is being used on.
 *
 * Lifecycle:
 *  - Sysadmin uploads a zip file. The API generates a fresh UUID, unzips into
 *    `<adaptersRoot>/<language>/scripts/<uuid>/`, and stores the UUID in
 *    `script_dir_name`. The DB-level UNIQUE constraint on that column makes
 *    accidental reuse impossible.
 *  - On every subsequent re-upload, a new UUID is allocated and a new directory
 *    is written. The audit-log trigger captures the old `script_dir_name`
 *    value, which means the on-disk file from any past version is still
 *    referenced by the log and can be inspected for forensics.
 *  - DELETE removes the row but never touches the filesystem; old script
 *    directories are kept indefinitely (a future cleanup job mirroring the
 *    source-spec sample-file cleanup will eventually age them out).
 *
 * `language` is intentionally immutable after creation — changing it would
 * invalidate all cached venvs and runner expectations.
 */
@Entity("adapter_specifications")
@Check("CHK_adapter_specifications_name_not_empty", `"name" <> ''`)
@Check("CHK_adapter_specifications_script_dir_name_not_empty", `"script_dir_name" <> ''`)
@Check("CHK_adapter_specifications_entry_point_not_empty", `"entry_point" <> ''`)
export class AdapterSpecificationEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: "id", type: "int" })
    id!: number;

    @Column({ name: "name", type: "varchar", unique: true })
    name!: string;

    @Column({ name: "description", type: "varchar", nullable: true })
    description!: string | null;

    @Column({ name: "language", type: "enum", enum: AdapterLanguageEnum })
    @Index()
    language!: AdapterLanguageEnum;

    /**
     * The UUID-derived directory name under
     * `<adaptersRoot>/<language>/scripts/`. Stored as a plain string column;
     * the API constructs the full path at runtime from `language` + this value.
     *
     * UNIQUE at the database level so the filename is a true global ID. Once
     * a value has been used here, it must never be reused.
     */
    @Column({ name: "script_dir_name", type: "varchar", unique: true })
    scriptDirName!: string;

    /**
     * Path inside the unzipped script tree to the entry-point file the runner
     * should execute (e.g. `main.py`, `main.R`, `index.js`, `transform.sql`).
     * Required so the runner does not have to guess.
     */
    @Column({ name: "entry_point", type: "varchar" })
    entryPoint!: string;

    @Column({ type: "boolean", default: false })
    @Index()
    disabled!: boolean;

    @Column({ name: "comment", type: "varchar", nullable: true })
    comment!: string | null;

    @Column({ name: "log", type: "jsonb", nullable: true })
    log!: BaseLogVo[] | null;
}

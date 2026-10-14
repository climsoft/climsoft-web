import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorSpecificationEntity } from "../../metadata/connector-specifications/entities/connector-specifications.entity";

/**
 * Where a run is in its life. A run row is created the moment a schedule fires
 * or a sysadmin asks for one, so it exists before anything has been done — the
 * vocabulary describes a connector run, not a generic worker task.
 */
export enum ConnectorRunStatusEnum {
    /** Created and waiting for the dispatcher. Nothing has touched the server. */
    QUEUED = 'queued',
    /** Listing, or draining what listing found. */
    RUNNING = 'running',
    /** Ran to completion. Individual files inside it may still have failed. */
    FINISHED = 'finished',
    /** The run itself could not complete — could not connect, listing threw,
     *  or ingestion gave up. The reason is in `errorMessage`. */
    FAILED = 'failed',
    /** Stopped deliberately by a sysadmin. Anything not yet ingested stays
     *  `pending` and the next run resumes it. */
    CANCELLED = 'cancelled',
}

/** What caused this run to exist. */
export enum ConnectorRunTriggerEnum {
    SCHEDULE = 'schedule',
    MANUAL = 'manual',
}

/** Queued or running — a run that has not yet reached a terminal state. */
export const ACTIVE_RUN_STATUSES = [ConnectorRunStatusEnum.QUEUED, ConnectorRunStatusEnum.RUNNING];

/**
 * One row per connector run — both the work order and the record of the work.
 *
 * It is the top tier of a three-tier record:
 *
 *   run  → this table            "is this run slow, and broadly why?"
 *   spec → connector_run_specs   "which specification is responsible?"
 *   file → connector_run_files   "which individual file is pathological?"
 *
 * Each tier is summed from the one below it, but only ever one step at a time.
 * This table stores no counts or timings of its own — they are summed from the
 * spec rows on read — and the spec rows are in turn reconciled from the file
 * rows once, at the end of a drain. Going straight from this tier to the file
 * tier was measured at four orders of magnitude more expensive; see the note
 * where those columns used to be.
 *
 * Both lower tiers cascade from here, so deleting a run discards everything it
 * recorded — including the import de-duplication rows in `connector_run_files`,
 * which is why deletion has to be sequenced with the file server (the sysadmin
 * workflow: disable connector → archive/clear the directories → delete the runs
 * → re-enable).
 */
@Entity("connector_runs")

/**
 * Only one run per connector may be active at a time; the partial unique index
 * below is what enforces it. Without that, a connector whose drain outlasts its
 * cron interval would stack a second copy of itself every tick, and two drains
 * of one connector would claim the same `pending` rows (claiming takes no row
 * locks — this deployment runs a single worker).
*/
@Index('uq_connector_runs_active', ['connectorId'], {
    unique: true,
    where: `status IN ('queued', 'running')`,
})
export class ConnectorRunEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
    id!: number;

    //---------------------------
    @Column({ name: 'connector_id', type: 'int' })
    @Index()
    connectorId!: number;
    @ManyToOne(() => ConnectorSpecificationEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'connector_id' })
    connectorSpecification!: ConnectorSpecificationEntity;
    //---------------------------

    // ── Queue state ─────────────────────────────────────────────────────

    @Column({ name: 'status', type: 'enum', enum: ConnectorRunStatusEnum, default: ConnectorRunStatusEnum.QUEUED })
    @Index()
    status!: ConnectorRunStatusEnum;

    @Column({ name: 'triggered_by', type: 'enum', enum: ConnectorRunTriggerEnum })
    @Index()
    triggeredBy!: ConnectorRunTriggerEnum;

    /** When the dispatcher may pick this up. A retry sets it into the future. */
    @Column({ name: 'scheduled_at', type: 'timestamptz' })
    @Index()
    scheduledAt!: Date;

    @Column({ name: 'attempts', type: 'int', default: 0 })
    attempts!: number;

    @Column({ name: 'max_attempts', type: 'int', default: 1 })
    maxAttempts!: number;

    /**
     * Why the run as a whole failed. Distinct from a file failing inside an
     * otherwise fine run — that lives on `connector_run_files.last_error`. The
     * common case here is "could not reach the server", which is precisely the
     * failure that produces no snapshot at all.
     */
    @Column({ name: 'error_message', type: 'varchar', nullable: true })
    errorMessage!: string | null;

    // ── Snapshot marker ─────────────────────────────────────────────────

    /**
     * When this run finished listing the server and recording what it found.
     *
     * Load-bearing, not decorative. An import run's de-duplication baseline is
     * the previous run's file rows, and a run that never reached the server has
     * none — join against it and every file looks new, re-importing the whole
     * file server. So the baseline is the newest run with this set, and a run
     * whose discovery did not complete is discarded rather than resumed.
     *
     * Null therefore means exactly one thing: this run never established what
     * was on the server. Note that a listing returning zero files is the
     * opposite — a complete and truthful snapshot of an empty directory — and
     * sets this normally.
     */
    @Column({ name: 'discovered_at', type: 'timestamptz', nullable: true })
    @Index()
    discoveredAt!: Date | null;

    // ── Timing ──────────────────────────────────────────────────────────

    /**
     * How long this run spent WALKING THE SERVER'S DIRECTORIES over FTP/SFTP,
     * before anything was matched, compared or downloaded.
     *
     * The one timing this tier stores itself, and the exception is principled:
     * every other figure a run reports is summed from its spec rows, but a
     * listing is a single walk shared by every binding, so it belongs to no spec
     * and no aggregation of the tiers below can reconstruct it. Exactly the
     * argument that puts `scanned_count` on the spec tier — a number with
     * nowhere else to live.
     *
     * It was previously only logged, which left a fifth to a third of a run's
     * wall clock unattributed: measured at 13-17s of a 31-84s run on a
     * connector holding ~580k files, against spec rows that accounted for the
     * rest. It is also the truest "this directory needs a clean-up" signal
     * there is, because it is paid in full on every run whether or not a single
     * file changed.
     *
     * Written by the same UPDATE that stamps `discovered_at`, so it costs no
     * extra round trip.
     *
     * Null for: an export (nothing is listed), a run that never reached the
     * server, and a run still listing. A RESUMED run keeps the value from
     * whichever attempt did the listing, because discovery is skipped once a
     * snapshot exists — the figure describes that attempt, not this one.
     */
    @Column({ name: 'listing_ms', type: 'int', nullable: true })
    listingMs!: number | null;

    /** Null until the dispatcher starts the run. */
    @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
    @Index()
    startedAt!: Date | null;

    /** Null until the run reaches a terminal state. */
    @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
    @Index()
    endedAt!: Date | null;
}

// Represents metadata about a file (downloaded or processed) (FTP/SFTP/etc.)
export interface FileMetadataVo {
    fileName: string;

    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string.
    //
    // null when the server did not report a modification time for the entry
    // (e.g. some FTP LIST listings). Change detection then falls back to
    // size-only comparison rather than treating the file as always-changed.
    modifiedDate: string | null; // ISO string format

    size: number;
}

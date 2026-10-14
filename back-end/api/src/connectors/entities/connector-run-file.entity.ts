import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ConnectorSpecificationEntity } from "src/metadata/connector-specifications/entities/connector-specifications.entity";
import { ConnectorRunEntity } from "./connector-run.entity";

/**
 * NOTE for whoever adds the next value here: TypeORM's `synchronize` CANNOT do
 * it, and the failure takes the whole API down rather than being skipped.
 *
 * Its strategy for changing an enum is to rename the type to `<name>_old`,
 * create a replacement, and re-type the column with a USING cast. That cast
 * fails on this table because the partial indexes below carry `last_status`
 * predicates, leaving the API unable to start:
 *
 *     operator does not exist:
 *       connector_run_files_last_status_enum = connector_run_files_last_status_enum_old
 *
 * Postgres can add the value natively — no table rewrite, no index rebuild —
 * and once it has, `synchronize` sees the type already matches and leaves it
 * alone. Run this FIRST, then start the API:
 *
 *     ALTER TYPE connector_run_files_last_status_enum ADD VALUE IF NOT EXISTS '<value>';
 *
 * The same applies to any deployment, so this is one of the few schema changes
 * that needs a real migration step rather than riding on `synchronize`.
 */
export enum RunFileStatusEnum {
    /**
     * Import only: discovered as new, changed, or not previously successful,
     * and not yet acted on. This is what makes the table a work queue — the
     * discovery phase writes `pending` rows and downloads nothing, the ingestion
     * phase claims them a page at a time. A row is never left `pending` by a
     * completed run: every claimed row is settled before the batch moves on, so
     * anything still `pending` is either un-started work or work a crash
     * interrupted, and in both cases the next run resumes it without re-listing.
     */
    PENDING = 'pending',
    /**
     * Import only: matched the spec's pattern but was already ingested
     * successfully and has not changed since. Written once by discovery and
     * never touched again. These rows are what make a run's record a complete
     * snapshot of the file server rather than only a list of what it touched,
     * and they are what the next run's change detection reads.
     */
    SKIPPED = 'skipped',
    SUCCESS = 'success',
    FAILED = 'failed',
    /**
     * Import only: downloaded successfully, but held nothing to import. Either
     * the file had no bytes at all, or its content transformed to no
     * observations — no data rows, or every value missing under a specification
     * that does not import missing values.
     *
     * NOT a file whose dates failed to parse. That is a specification problem,
     * recorded as `failed` so it is retried and imports once the format is
     * corrected. Freezing it here would lose the data silently.
     *
     * Its own outcome rather than a `failed`, because it is neither a failure
     * nor a success and treating it as either loses information. It is not a
     * failure: nothing went wrong, retrying cannot help, and the transform's
     * complaint ("a column position is out of range") describes the last step
     * to trip over the emptiness rather than the cause, which sends a sysadmin
     * to check column positions that were never wrong. It is not a success
     * either: no observation was recorded.
     *
     * It IS worth counting. Per file it is noise, but in aggregate it is a real
     * maintenance signal — a run of empty files from one station usually means
     * a data logger is recording with its instruments disconnected, which is
     * exactly the kind of fact this platform exists to surface.
     *
     * Detected right after the download and before the transform, so an empty
     * file costs one transfer rather than a transfer plus an adapter run plus a
     * DuckDB pipeline. It also keeps `failed` meaning "might work next time",
     * and stops empty files consuming the retained-operation-directory budget
     * that exists for failures worth inspecting.
     *
     * Carried forward by change detection the way `success` is: an unchanged
     * empty file stays `empty` on the next run instead of being downloaded
     * again. If it later gains content its size changes and it becomes
     * `pending` normally.
     */
    EMPTY = 'empty',
    /**
     * Import only: matched the binding's file pattern but dropped by one of its
     * exclude globs, so nothing was downloaded, processed or attempted.
     *
     * Recorded rather than simply skipped over so that a sysadmin can SEE what
     * an exclusion is catching. An exclusion is a rule about data the connector
     * must never read, and a rule nobody can inspect is one nobody can trust —
     * the failure mode being an exclusion slightly too broad, quietly dropping
     * real data files for months.
     *
     * Written by discovery and never touched again, like `skipped`. Bounded by
     * the pattern's matches, not by the directory: an excluded file is one that
     * matched the include glob first.
     *
     * Carried forward by nothing. Each run re-decides exclusion from the
     * binding's current globs, so removing a glob leaves the file's previous
     * row as `excluded`, which change detection reads as "not previously
     * ingested" and queues normally.
     */
    EXCLUDED = 'excluded',
}

/**
 * One row per file a connector run acted on.
 * A connector is import-type or export-type for its
 * whole life (`connector_specifications.connector_type` is immutable after
 * creation), so a row's direction is whatever its connector is:
 *
 *  - Import connector: every file the run matched, keyed by (run, source spec,
 *    remote path). Discovery writes one row per matched file in a single
 *    statement joined against the PREVIOUS run's rows: unchanged files land as
 *    `skipped`, everything else as `pending`. Ingestion then claims `pending`
 *    rows a page at a time and settles each one.
 *
 *    So a run's rows are three things at once. The complete state of the file
 *    server at that moment, which makes the record permanent — nothing is ever
 *    updated across runs, so a failure in one run survives a later run
 *    succeeding on the same file. The work queue for its own drain, which keeps
 *    a run's memory footprint at the page size rather than the server's file
 *    count and lets an interrupted run resume from the rows themselves. And the
 *    de-duplication state for the run that follows.
 *
 *    Only the NEWEST run's rows are load-bearing for de-duplication; every older
 *    run is history. That is what makes automatic retention safe (see
 *    CleanupSchedulerService) as long as a connector always keeps at least one.
 *  - Export connector: every file the run generated, success or failure, in one
 *    batch at the end. These rows carry no de-duplication function — export
 *    file names are timestamped and nothing is ever compared against them — so
 *    unlike an import row this is a pure audit trail, kept bounded by run
 *    retention rather than by writing less. That trade is affordable in a way
 *    it would not be on the import side: an export run generates a handful of
 *    files where an import discovers hundreds of thousands, so one run's worth
 *    of retention covers far more export runs than import ones. A spec that
 *    generated nothing writes one row with an empty `remote_path` carrying the
 *    error.
 *
 * `specification_id` points at `source_templates` (import connector) or
 * `export_specifications` (export connector), so it has no FK; the
 * `connector_id` CASCADE covers connector deletion, and the
 * `connector_run_id` CASCADE covers run deletion.
 */
@Entity("connector_run_files")
// The work-queue index. Every run start asks "is there a backlog?" and every
// batch claims the next page from it, so both run constantly. Partial (pending
// only) so it holds just outstanding work rather than the whole snapshot, and it
// empties as a run drains. Column order matches the claim's ORDER BY, so a batch
// is an index scan that stops at LIMIT rather than sorting every remaining
// pending row on each of ~1,400 batches.
@Index("idx_connector_run_files_pending", ["connectorRunId", "fileMtime"], { where: "last_status = 'pending'" })
// The failure drill-down. A run lists every file it matched, so finding the
// handful that failed among hundreds of thousands is the one lookup a sysadmin
// actually needs from this table, and paging to it is hopeless without an index.
//
// Partial, and deliberately not a plain index on last_status. That column has
// four values across the whole snapshot, so indexing it in full builds a large
// low-cardinality btree that every one of a run's ~280k inserts has to maintain,
// to serve one human-triggered page load. Restricting it to failures means
// almost no insert touches it, the index stays tiny, and the drill-down becomes
// an index scan already in remote_path order — no sort, at any table size.
@Index("idx_connector_run_files_failed", ["connectorRunId", "remotePath"], { where: "last_status = 'failed'" })
export class ConnectorRunFileEntity {
    //---------------------------
    // The identity IS the primary key: a file appears at most once per run, which
    // is what makes each run's rows a snapshot rather than a mutable ledger.
    // There is deliberately no surrogate id. Discovery inserts one row per
    // matched file — 280k on a large first run, every run — and a generated key
    // would mean maintaining a second btree on every one of those inserts purely
    // to identify rows that these three columns already identify. It also leads
    // with connector_run_id, so the run-scoped reads (the drain's
    // claim, the drill-down, the CASCADE delete) and the change-detection join
    // all use this one index.
    @PrimaryColumn({ name: "connector_run_id", type: "bigint" })
    connectorRunId!: number;
    // CASCADE, so deleting a run discards its whole snapshot.
    @ManyToOne(() => ConnectorRunEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "connector_run_id" })
    connectorRun!: ConnectorRunEntity;

    /**
     * The connector binding this file was read under —
     * `connector_specification_bindings.id`.
     *
     * This is the column change detection joins on, so it is the column that
     * decides what "the same file" means between two runs. It is a binding and
     * not a specification because one specification is routinely bound several
     * times over: to different stations, and — since a pattern cannot name two
     * directories at once — to the same station over a live folder and an
     * archive folder. Keyed by specification, those bindings share rows and
     * overwrite each other; keyed by binding, each keeps its own ledger.
     *
     * No foreign key, deliberately. A run is a historical record: deleting a
     * binding from the connector must not erase what past runs did under it, and
     * a `CASCADE` here would do exactly that on a table holding hundreds of
     * thousands of rows per run. The cost is that the id can dangle, which the
     * drill-down handles by falling back to the denormalised columns below.
     */
    @PrimaryColumn({ name: "binding_id", type: "int" })
    bindingId!: number;

    // Import: full path as listed by the server, e.g. "stationA/2024/data.csv".
    // Export: the generated file name, or '' for a spec that generated nothing.
    @PrimaryColumn({ name: "remote_path", type: "varchar" })
    remotePath!: string;
    //---------------------------

    // Import: source_templates id. Export: export_specifications id. No FK — see
    // the class comment. Denormalised from the binding: the drain reads the
    // mapping off the row rather than off the connector, so that a backlog
    // discovered under one mapping is never drained under another, and so that
    // the row still says what it meant after the binding is edited or deleted.
    //
    // Deliberately NOT indexed. It was, for a reprocess endpoint that filtered
    // on it after this stopped being a key column — an index measured at
    // 493 MB, scanned once in its life, and paid on every one of a run's ~280k
    // inserts. Both the endpoint and the index are gone; this column is now
    // only ever read back with the row it belongs to.
    @Column({ name: "specification_id", type: "int" })
    specificationId!: number;

    //---------------------------
    // Denormalised from the run so connector-scoped sweeps (the reprocess purge,
    // the retained-directory queries) do not have to join through it.
    @Column({ name: "connector_id", type: "int" })
    connectorId!: number;

    @ManyToOne(() => ConnectorSpecificationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "connector_id" })
    connector!: ConnectorSpecificationEntity;
    //---------------------------

    // Denormalised from the binding, for the same reason as specification_id
    // above: it is what the file was actually read as. Change detection compares
    // it against the binding's current station so that re-pointing a binding
    // re-reads its files under the new one.
    @Column({ name: "station_id", type: "varchar", nullable: true })
    stationId!: string | null;

    // Import: the server's reported modification time (drives change detection);
    // null when the server reported none, then change detection falls back to
    // size-only — the only fallback there is (we deliberately do not
    // content-hash: hashing an FTP/SFTP file means downloading it).
    // Export: when the file was generated.
    @Column({ name: "file_mtime", type: "timestamptz", nullable: true })
    fileMtime!: Date | null;

    // bigint, not int: a connector could handle files larger than int4's
    // ~2.14 GB ceiling. Postgres returns bigint as a string, so the transformer
    // coerces to number — lossless below Number.MAX_SAFE_INTEGER (~9 PB), far
    // beyond anything realistic. Only ever compared for equality.
    @Column({
        name: "file_size",
        type: "bigint",
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => (value === null || value === undefined ? null : Number(value)),
        },
    })
    fileSize!: number | null;

    // Not indexed on its own: see idx_connector_run_files_failed above for why a
    // full index on four distinct values is the wrong shape here.
    @Column({ name: "last_status", type: "enum", enum: RunFileStatusEnum })
    lastStatus!: RunFileStatusEnum;

    @Column({ name: "last_error", type: "varchar", nullable: true })
    lastError!: string | null;

    // How long THIS run spent doing LOCAL work on this file. Import: the DuckDB
    // transform plus the Postgres load. Export: always null — an export does no
    // per-file local work; generating happens once per spec and is charged to
    // connector_run_specs.scan_ms.
    // Rows never move between runs, so summing this over a run's rows is
    // exactly that run's processing time.
    // Null (not 0) when processing never ran: a skipped file, a still-pending
    // one, a download that failed before processing started, or an export spec
    // that failed to generate anything.
    //
    // Excludes the transfer, which is measured separately as last_transfer_ms.
    // The two are sequential, so they add up to a file's cost — but they answer
    // different questions, and only splitting them tells a sysadmin whether a
    // slow connector is a slow file server or a slow source specification.
    @Column({ name: "last_process_ms", type: "int", nullable: true })
    lastProcessMs!: number | null;

    // How long THIS run spent moving this file over the network, in whichever
    // direction the connector runs: downloading it off the file server for an
    // import, uploading it for an export. Recorded for failed transfers too — a
    // slow failure is itself the signal. Null when none was attempted: a
    // skipped file, a pending one, or an export spec that generated nothing.
    //
    // One column for both directions because the question is the same either
    // way: is the network slow, or is our own work slow? While this was
    // `last_download_ms`, an export's upload was recorded as processing, where
    // it could not be told apart from the cost of generating the file.
    @Column({ name: "last_transfer_ms", type: "int", nullable: true })
    lastTransferMs!: number | null;

    // Import: observations the file wrote to Postgres — inserted or
    // overwritten — when it settled as `success`. Null for every other status,
    // and for a skipped file, which wrote nothing in this run.
    //
    // Export: always null. One COPY can produce many files — an adapter or a
    // dissemination service reshapes it — so a per-file share of its rows would
    // be invented. The export's count lives on the spec tier instead.
    //
    // What tells a file that imported 3 observations apart from one that
    // imported 5,000, when both simply read "success". A specification whose
    // station or element mappings silently drop most of a file still succeeds;
    // this is where that shows.
    //
    // bigint, like file_size: a single file can be large enough — years of
    // high-frequency logger output in one export — to pass int4's ~2.1 billion
    // once each row is unpivoted into several observations. Postgres returns
    // bigint as a string, so the transformer coerces it to a number.
    @Column({
        name: "observation_rows",
        type: "bigint",
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => (value === null || value === undefined ? null : Number(value)),
        },
    })
    observationRows!: number | null;

    // A retained operation directory kept for admin inspection. Currently only
    // set for failed import files (the remote source may rotate away); exports
    // never retain (regenerable). The orphaned-operation cleanup sweep treats a
    // non-null value here as "still referenced".
    //
    // Indexed for that sweep, the run delete and the per-run retention budget.
    // Partial for the same reason as the failure index above and more so: the
    // column is null for every row except a failed import that kept its
    // downloaded file, which MAX_RETAINED_OPERATION_DIRS caps at 500 per run.
    // Every query that touches it already filters `IS NOT NULL`, so a partial
    // index serves all of them while staying out of the insert path entirely.
    @Index("idx_connector_run_files_operation", { where: "operation_id IS NOT NULL" })
    @Column({ name: "operation_id", type: "varchar", nullable: true })
    operationId!: string | null;

    // When this file was last acted on. Used for support ("has this been
    // reprocessed since T?").
    @Column({ name: "last_processed_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    lastProcessedAt!: Date;
}

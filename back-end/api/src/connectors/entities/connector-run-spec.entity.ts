import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ConnectorRunEntity } from "./connector-run.entity";

/**
 * One row per connector specification per run — the middle tier between the run
 * summary (`connector_runs`) and the per-file detail
 * (`connector_run_files`). It answers "which specification is making this
 * connector slow?".
 *
 * It is also the tier the run summary is summed from, which makes it the only
 * place a run's totals exist — the run row stores none of its own. That is a
 * measured choice: a run has single digits of spec rows but can have hundreds
 * of thousands of file rows, so summing a page of runs from here costs 0.2ms
 * against ~2,800ms from the file tier. The counts below are kept true by
 * incrementing them per ingestion batch and reconciling them from the file rows
 * once, when a drain ends.
 *
 * It exists as its own table rather than as per-file columns because two of its
 * numbers are not derivable from the run's files at all. `scanned_count` counts
 * entries in the spec's directory scope BEFORE the filename glob, and files that
 * were scanned but did not match are never written; `scan_ms` is wall time and
 * belongs to no row. Together they are the "this directory needs a clean-up"
 * signal, and they are paid in full by a run in which nothing changed: list 100k
 * files, filter 100k files, ingest none.
 *
 * Bounded by specification count, not file count — a connector with ten specs
 * on a fifteen-minute schedule writes ~350k narrow rows a year, the same order
 * as the run table itself, and cascades away with it.
 *
 * Column meanings depend on the connector's direction (immutable per connector,
 * so it is always unambiguous); see each column.
 */
@Entity("connector_run_specs")
export class ConnectorRunSpecEntity {
    //---------------------------
    // The identity IS the primary key. There is exactly one row per BINDING per
    // run, and no surrogate id, for a correctness reason rather than a size one:
    // both the per-batch increment and the end-of-drain reconcile UPDATE by
    // exactly this pair, and a generated key would leave nothing stopping a
    // duplicate row that those updates would then silently both hit.
    //
    // CASCADE on the run: deleting a run discards everything it recorded, this tier
    // included.
    @PrimaryColumn({ name: "connector_run_id", type: "bigint" })
    connectorRunId!: number;
    @ManyToOne(() => ConnectorRunEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "connector_run_id" })
    connectorRun!: ConnectorRunEntity;

    /**
     * The connector binding this row tallies —
     * `connector_specification_bindings.id`.
     *
     * The key was `(run, specification_id)` first and `(run, specification_id,
     * station_id)` after that, and both were the same mistake: identifying a
     * binding by its contents. A specification is reused across stations with
     * identical loggers, and a station can be bound to one specification twice
     * over two directories, because a pattern's directory segments are literal
     * and the grammar has no brace expansion. Every content key eventually
     * collides, and the collision surfaces as discovery dying mid-run on
     *
     *     duplicate key value violates unique constraint "PK_..."
     *
     * A binding id cannot collide, because it is what a binding IS.
     *
     * No foreign key — a finished run must keep its record after the binding
     * behind it is edited away or deleted. The denormalised columns below are
     * what the drill-down reads when the id no longer resolves.
     */
    // Change detection resolves each binding's baseline from this tier — "the
    // newest run that actually covered this binding" — so this lookup runs once
    // per binding on every discovery. The primary key leads with
    // `connector_run_id`, and a btree cannot seek on a non-leading column
    // (Postgres has no index skip scan before 18), so it needs its own.
    //
    // Deliberately on THIS tier and not on connector_run_files, even though the
    // file rows could answer the same question. This table is bounded by
    // bindings x runs (a handful of narrow rows per run); that one takes
    // hundreds of thousands of inserts per run, and every index on it is paid
    // on every one of them.
    @PrimaryColumn({ name: "binding_id", type: "int" })
    @Index("idx_connector_run_specs_binding")
    bindingId!: number;

    // Import: source_templates id. Export: export_specifications id. Snapshotted
    // from the binding rather than joined, so the row still reports what ran
    // after the binding has been re-pointed or removed.
    @Column({ name: "specification_id", type: "int" })
    specificationId!: number;

    // The station this binding read as, as it stood for this run. Null when the
    // specification carries the station itself.
    @Column({ name: "station_id", type: "varchar", nullable: true })
    stationId!: string | null;

    //---------------------------

    /**
     * The binding was switched off for this run, so nothing was listed, matched
     * or ingested for it.
     *
     * The row is still written, with every count at zero. Omitting it would
     * make a disabled binding indistinguishable in the run history from one
     * that was deleted, and from one that scanned a directory and legitimately
     * found nothing — three very different things that a sysadmin reading a run
     * needs told apart.
     *
     * It also keeps this tier honest as the baseline index: a disabled row
     * records that the run did NOT cover the binding, which is exactly what
     * `findBaselineRunIds` must exclude when deciding what to compare against.
     */
    @Column({ name: "disabled", type: "bool", default: false })
    disabled!: boolean;

    // Import: the spec's filePattern as it stood for this run — denormalised
    // because the pattern can be edited later and the run must keep showing
    // what actually ran. Export: null (export specs have no pattern).
    @Column({ name: "file_pattern", type: "varchar", nullable: true })
    filePattern!: string | null;

    // Import: the binding's exclude globs as they stood for this run,
    // denormalised for the same reason as `file_pattern`. Export: empty.
    @Column({ name: "exclude_patterns", type: "varchar", array: true, default: () => "'{}'" })
    excludePatterns!: string[];

    // ── Counts ──────────────────────────────────────────────────────────
    // Import: entries in this spec's directory scope before the filename glob
    // was applied — the leading indicator of a directory needing a clean-up,
    // because it grows with the file server whether or not anything changes.
    // Export: 0 (nothing is scanned).
    @Column({ name: "scanned_count", type: "int", default: 0 })
    scannedCount!: number;

    // Import: files the pattern matched but an exclude glob dropped. They get no
    // run-file row, so this is the only record that they were there — kept so
    // an exclusion shows up as "12 excluded" rather than as files quietly
    // missing between scanned and matched. Not derivable from the file tier,
    // so set once at discovery and never reconciled. Export: 0.
    @Column({ name: "excluded_count", type: "int", default: 0 })
    excludedCount!: number;

    // Import: files matching the pattern and not excluded. Export: files
    // generated.
    @Column({ name: "matched_count", type: "int", default: 0 })
    matchedCount!: number;

    // Import: files imported. Export: files uploaded.
    @Column({ name: "succeeded_count", type: "int", default: 0 })
    succeededCount!: number;

    // Import: matched but unchanged since a prior success. Export: 0.
    @Column({ name: "skipped_count", type: "int", default: 0 })
    skippedCount!: number;

    // Import: files that arrived with no bytes in them. Counted apart from
    // failures because retrying cannot help and nothing is wrong with the
    // connector — a sustained count here points at a data logger recording with
    // its instruments disconnected. Export: 0 (an export generates its files).
    @Column({ name: "empty_count", type: "int", default: 0 })
    emptyCount!: number;

    // Import: failed download / processing / import.
    // Export: generation failure + failed uploads.
    @Column({ name: "failed_count", type: "int", default: 0 })
    failedCount!: number;

    // Observations this binding moved in this run, in whichever direction the
    // connector runs. Import: rows written to Postgres, summed from
    // connector_run_files.observation_rows. Export: rows read OUT of Postgres
    // by the COPY that built the files — not records in what was finally
    // written, since an adapter or a dissemination service reshapes them (a
    // WIS2BOX export emits one bulletin per report). Counted per specification
    // because that COPY runs once per specification.
    //
    // Free in both directions: it is the row count of a statement that was
    // being run anyway, never a COUNT(*) of its own.
    //
    // What tells an export that sent 5,000 observations apart from one that
    // quietly sent 30 after a station list was edited — both of which upload a
    // file and report success.
    //
    // bigint where the counts above are int: a file count stays small, but a
    // binding over a large archive re-imported in one run can pass int4's
    // ~2.1 billion. Postgres returns bigint as a string; the transformer
    // coerces it, lossless far past anything realistic.
    @Column({
        name: "observation_rows",
        type: "bigint",
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string | null) => (value === null || value === undefined ? 0 : Number(value)),
        },
    })
    observationRows!: number;

    // ── Timings ─────────────────────────────────────────────────────────
    // Import: matching the listing against this spec's pattern, the de-dup
    // ledger lookup, and the change diff. All of it on the event loop, so this
    // is the "clean up the file server" signal. Export: generation time.
    //
    // Deliberately NOT indexed. It was, to "find the slowest specs directly",
    // but the only query that orders by it is the per-run drill-down, which
    // reads one run's rows — bindings per connector, single digits — and sorts
    // them in memory faster than any index could be consulted. An index would
    // have to be maintained on every insert to serve a sort that never needed
    // one. A cross-run "slowest specifications" report, if it is ever wanted,
    // wants an index keyed for that query, not this one.
    @Column({ name: "scan_ms", type: "int", default: 0 })
    scanMs!: number;

    // Import: rollup of this spec's per-file processing (DuckDB transform +
    // Postgres load), which runs off the event loop — a high value here means
    // large files, not too many of them. Export: 0, and honestly so — an export
    // does no per-file local work. Its uploads are transfers (below) and its
    // generation is charged to scan_ms, which happens once per spec.
    //
    // WORKER TIME, not elapsed time. Files are ingested INGEST_CONCURRENCY at a
    // time and every worker adds its own per-file cost here, so this can exceed
    // the run's wall clock several times over — measured at 8h06m of processing
    // inside a run lasting 1h52m. Its ratio to the duration is roughly the
    // parallelism achieved; it is not a slice of the duration.
    @Column({ name: "process_ms", type: "int", default: 0 })
    processMs!: number;

    // Bytes over the network, in whichever direction the connector runs:
    // downloads for an import, uploads for an export, summed from
    // connector_run_files.last_transfer_ms.
    //
    // One column for both directions because the question it answers is the
    // same either way — "is this connector slow because of the network or
    // because of our own work?". It was `download_ms` and always 0 for exports,
    // whose upload time hid inside process_ms, where it could not be told apart
    // from the cost of generating the files.
    //
    // Stored here rather than summed from the file tier on demand for the same
    // reason every other number is: a run has a handful of spec rows and
    // hundreds of thousands of file rows, and aggregating the file tier for a
    // page of runs was measured at ~2,800ms against 0.2ms from here.
    //
    // It replaces a derived "transfer = duration - scan - process", which could
    // only ever be right at concurrency 1 and in practice went negative and was
    // clamped to zero, reporting no transfer time at all.
    //
    // Also worker time, and additionally overlapped: transfers are serialised on
    // one file-server session while processing runs concurrently, and they
    // deliberately hide inside each other. Do not expect scan + download +
    // process to equal the run's duration.
    @Column({ name: "transfer_ms", type: "int", default: 0 })
    transferMs!: number;
}

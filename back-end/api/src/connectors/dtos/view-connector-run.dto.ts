import { ConnectorRunStatusEnum, ConnectorRunTriggerEnum } from "../entities/connector-run.entity";

/**
 * One connector run as the API returns it — the stored row plus the aggregates
 * that are no longer stored with it.
 *
 * The shape is deliberately identical to what `ConnectorRunEntity` used to
 * serialise, so nothing downstream had to change when the seven aggregate
 * columns were dropped. Everything from `totalFiles` down is summed from
 * `connector_run_specs`, or computed from the two execution timestamps, at read
 * time; see ConnectorRunEntity for why that tier and not the file tier.
 *
 * A run whose discovery never wrote spec rows — one that could not reach the
 * server — sums to zeros, which is correct: it has no files either.
 */
export interface ViewConnectorRunDto {
    id: number;
    connectorId: number;
    status: ConnectorRunStatusEnum;
    triggeredBy: ConnectorRunTriggerEnum;
    scheduledAt: Date;
    attempts: number;
    maxAttempts: number;
    /**
     * Why the run as a whole failed. Distinct from a file failing inside an
     * otherwise fine run, which is on the run-file row instead.
     */
    errorMessage: string | null;
    /** Null means the run never established what was on the server. */
    discoveredAt: Date | null;
    /**
     * Time spent walking the server's directories, before anything was matched
     * or downloaded. Null for an export, and for a run that never listed. On a
     * resumed run it belongs to the attempt that did the listing.
     */
    listingMs: number | null;
    startedAt: Date | null;
    endedAt: Date | null;

    // ── Summed from connector_run_specs ─────────────────────────────────
    /**
     * Import: entries seen in the scanned directories, before any file pattern
     * was applied — the number that grows with the file server whether or not
     * anything changed. Export: 0 (nothing is scanned).
     */
    scannedCount: number;
    /** Import: files matched (changed + unchanged). Export: files generated. */
    totalFiles: number;
    /** Import: files imported. Export: files uploaded. */
    successCount: number;
    /** Import: matched but unchanged since a prior success. Export: 0. */
    skippedCount: number;
    /** Files that failed. Per-file detail is in connector_run_files. */
    failedCount: number;
    /**
     * Import: files downloaded successfully that held no bytes. Counted apart
     * from failures because retrying cannot help; a sustained count points at a
     * logger recording with its instruments disconnected. Export: 0.
     */
    emptyCount: number;
    /**
     * Import: files a pattern matched but an exclude glob dropped. They get a
     * run-file row, recorded as `excluded` so the exclusion can be inspected,
     * but are not part of `totalFiles`: nothing was downloaded or attempted for
     * them. Export: 0.
     */
    excludedCount: number;
    /** Import: observations written to Postgres by this run. Export: 0. */
    observationRows: number;
    /**
     * Import: event-loop time matching listings against patterns and diffing
     * them — the "this directory needs a clean-up" signal.
     * Export: time spent generating files.
     */
    totalScanMs: number;
    /**
     * Local per-file work: an import's DuckDB transform plus Postgres load, off
     * the event loop. 0 for an export, which does none — its uploads are
     * transfers and its generation is counted in totalScanMs.
     *
     * WORKER TIME, not a slice of the duration — see totalTransferMs.
     */
    totalProcessMs: number;
    /**
     * Time spent moving bytes over the network: downloading for an import,
     * uploading for an export.
     *
     * Like totalScanMs and totalProcessMs this is WORKER time summed across
     * concurrent ingestion workers, not a slice of the run's wall clock, and
     * transfers deliberately overlap with processing. scan + transfer + process
     * therefore does NOT equal durationMs and is usually several times larger —
     * their ratio is roughly the parallelism the run achieved.
     */
    totalTransferMs: number;

    // ── Computed from the execution timestamps ──────────────────────────
    /**
     * Wall clock. For a run still going this is measured against now, so it
     * advances on its own; 0 for a run that has not started.
     */
    durationMs: number;

    entryUserId: number;
    entryDateTime: Date;
}

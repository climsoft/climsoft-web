export enum RunFileStatusEnum {
    /**
     * Import only: discovered as new or changed, not yet ingested. A run's
     * pending rows are its outstanding work — a run showing them is either still
     * draining or was interrupted, and the next run resumes from them.
     */
    PENDING = 'pending',
    /**
     * Import only: matched the pattern but was already ingested and has not
     * changed. An import run lists every file it matched, so its file list is
     * the whole file server as it stood, and most of it is usually this.
     */
    SKIPPED = 'skipped',
    SUCCESS = 'success',
    FAILED = 'failed',
    /**
     * Import only: downloaded fine but held no bytes. Its own outcome rather
     * than a failure — nothing went wrong and retrying cannot help. Common on
     * automatic stations whose logger writes its scheduled file while the
     * instruments are disconnected. Worth watching in aggregate: a run of these
     * from one station usually means a logger needs attention.
     */
    EMPTY = 'empty',
    /**
     * Import only: matched the file pattern but dropped by one of the
     * binding's exclude globs, so nothing was downloaded or attempted.
     * Recorded so an exclusion can be inspected rather than trusted blindly.
     */
    EXCLUDED = 'excluded',
}

/**
 * One row from GET /connector-execution-logs/:id/files — an entry in the
 * connector run-file ledger. Every file the run acted on, import or export.
 */
export interface ConnectorRunFileModel {
    // No surrogate id: a run file is keyed by its run, its BINDING and its
    // remote path, which is also its primary key server-side.
    connectorId: number;
    /**
     * The connector binding this file was read under. Identifies the row, and
     * is what the download endpoint addresses it by.
     *
     * A binding rather than a specification because one specification is
     * routinely bound more than once — to several stations, and to one station
     * over two directories.
     */
    bindingId: number;
    specificationId: number;
    stationId: string | null;
    // '' for an export spec that generated nothing (the error is in lastError).
    remotePath: string;
    fileMtime: string | null;
    fileSize: number | null;
    lastStatus: RunFileStatusEnum;
    lastError: string | null;
    connectorRunId: number;
    operationId: string | null;
    // Local work only. Import: the DuckDB transform plus the database load.
    // Export: always null — an export does no per-file local work. Null for an
    // import too when it never ran, e.g. the download failed.
    lastProcessMs: number | null;
    // Time moving the file over the network: downloaded for an import, uploaded
    // for an export, and recorded for failed transfers too. Kept apart from
    // lastProcessMs because the two say different things: a slow server, or a
    // slow source specification.
    lastTransferMs: number | null;
    // Import: observations written to the database (new or overwritten) when
    // the file settled as success. Null for any other status. Export: always
    // null — one COPY can produce many files, so an export's count is kept on
    // the specification row instead.
    observationRows: number | null;
    lastProcessedAt: string;
}

export interface ConnectorRunFilesPageModel {
    files: ConnectorRunFileModel[];
    total: number;
}

/**
 * One row from GET /connector-execution-logs/:id/specs — the per-specification
 * tier of a run. Answers "which specification is making this connector slow?".
 */
export interface ConnectorRunSpecModel {
    // Keyed by run plus binding, like the run files.
    connectorRunId: number;
    /** The connector binding this row tallies. */
    bindingId: number;
    /** The binding was switched off for this run; every count below is zero. */
    disabled: boolean;
    /**
     * The binding's position in the connector when this run happened, as the
     * sysadmin arranged them. It is the order discovery walked the bindings in,
     * so the table opens sorted by it, and the # column shows it rather than a
     * row counter — sort by another column and a spec still reads as "#3 in the
     * connector".
     */
    sortOrder: number;
    specificationId: number;
    stationId: string | null;
    // Null for export specs (they have no pattern).
    filePattern: string | null;
    // Import: the binding's exclude globs for this run. Export: empty.
    excludePatterns: string[];
    // Import: files in this spec's directory scope, before the filename glob —
    // the number that grows with the file server. Export: 0.
    scannedCount: number;
    // Import: files the pattern matched but an exclude glob dropped. They were
    // never downloaded and have no file rows. Export: 0.
    excludedCount: number;
    // Import: files matching the pattern and not excluded. Export: files generated.
    matchedCount: number;
    // Import: files imported. Export: files uploaded.
    succeededCount: number;
    // Import: unchanged since a prior success. Export: 0.
    skippedCount: number;
    failedCount: number;
    // Import: downloaded but held no bytes. Export: 0.
    emptyCount: number;
    // Observations moved: written to the database by an import, or read out of
    // it to build an export's files.
    observationRows: number;
    // Import: event-loop time matching and diffing the listing — the
    // "clean up this directory" signal. Export: generation time.
    scanMs: number;
    // Import: DuckDB + Postgres, off the event loop. Export: 0 — an export does
    // no per-file local work; generating is counted in scanMs.
    // Worker time summed across concurrent workers, not a slice of the duration.
    processMs: number;
    // Time over the network: downloads for an import, uploads for an export.
    transferMs: number;
}

/**
 * Where a run is in its life. A run exists from the moment its schedule fires,
 * so this describes a connector run rather than a generic worker task.
 */
export enum ConnectorRunStatusEnum {
    /** Created and waiting for the dispatcher. Nothing has touched the server. */
    QUEUED = 'queued',
    /** Listing, or draining what listing found. */
    RUNNING = 'running',
    /** Ran to completion. Individual files inside it may still have failed. */
    FINISHED = 'finished',
    /** The run itself could not complete — see errorMessage. */
    FAILED = 'failed',
    /** Stopped by a sysadmin. Whatever it had not ingested stays queued. */
    CANCELLED = 'cancelled',
}

export enum ConnectorRunTriggerEnum {
    SCHEDULE = 'schedule',
    MANUAL = 'manual',
}

export interface ViewConnectorRunModel {
    id: number;
    connectorId: number;
    status: ConnectorRunStatusEnum;
    triggeredBy: ConnectorRunTriggerEnum;
    scheduledAt: string;
    attempts: number;
    maxAttempts: number;
    /**
     * Why the run as a whole failed — most often that the server could not be
     * reached. Distinct from a file failing inside an otherwise fine run, which
     * is on the run-file row instead.
     */
    errorMessage: string | null;
    /**
     * When this run finished listing the server. Null means it never got that
     * far, so it holds no file records and is not the baseline the next run
     * compares against. A listing that returned zero files is the opposite — a
     * complete snapshot of an empty directory — and is stamped normally.
     */
    discoveredAt: string | null;
    // Import: time spent walking the server's directories, before anything was
    // matched or downloaded. Null for an export, for a run that never listed,
    // and — on a resumed run — it belongs to the attempt that did the listing.
    listingMs: number | null;
    // Null until the run starts / reaches a terminal state.
    startedAt: string | null;
    endedAt: string | null;
    // Per-run aggregates. Not stored on the run server-side — summed from its
    // per-specification rows on read — but returned in exactly this shape.
    // Import: entries seen in the scanned directories before any file pattern
    // was applied — grows with the file server whether or not anything changed.
    // Export: 0.
    scannedCount: number;
    // Import: matched files (changed + skipped-unchanged). Export: generated.
    totalFiles: number;
    // Import: files imported. Export: files uploaded.
    successCount: number;
    // Import: files unchanged since a prior success. Export: 0.
    skippedCount: number;
    // Files that failed. Per-file detail is in the run-file ledger.
    failedCount: number;
    // Files that arrived empty. Counted apart from failures: retrying cannot
    // help, and a sustained count means a logger is recording nothing.
    emptyCount: number;
    // Import: files dropped by a binding's exclude globs. Not part of
    // totalFiles — nothing was downloaded or attempted for them. Export: 0.
    excludedCount: number;
    // Observations moved by this run: written to the database by an import, or
    // read out of it to build an export's files.
    observationRows: number;
    // Wall clock for the whole run. Computed from the execution timestamps, so
    // for a run still going it advances on its own between polls.
    durationMs: number;
    // Sum of the per-spec scan times — event-loop cost.
    totalScanMs: number;
    // Sum of the per-spec processing times — off the event loop.
    totalProcessMs: number;
    // Sum of the per-spec transfer times. Import only; 0 for an export, whose
    // transfer is its upload and is counted as processing.
    //
    // This and the two above are WORKER time summed across concurrent ingestion
    // workers, and they overlap each other — scan + download + process does not
    // equal durationMs and is usually several times larger.
    totalTransferMs: number;
    entryUserId: number;
    entryDateTime: string;
}

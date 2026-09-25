import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorRunEntity, FileMetadataVo } from '../entities/connector-run.entity';
import { ConnectorRunService } from './connector-run.service';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ObservationImportService } from 'src/observation/services/observations-import.service';
import path from 'node:path';
import fs from 'node:fs';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';
import { ViewConnectorSpecificationModel } from 'src/metadata/connector-specifications/dtos/view-connector-specification.model';
import { ServerTypeEnum, ImportFileServerParametersDto, ImportFileServerSpecificationDto, FileServerProtocolEnum, ConnectorTypeEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { parseExcludePatterns, parseFilePattern } from 'src/metadata/connector-specifications/utils/connector-file-pattern.util';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';

import { FileProcessingError, FileProcessingErrorType } from 'src/metadata/file-processing-error.model';
import { ConnectorRunFileService, ClaimedRunFile, DiscoveredFile } from './connector-run-file.service';
import { ConnectorRunSpecService, RunSpecInsert, RunSpecProgress } from './connector-run-spec.service';
import { RunFileStatusEnum } from '../entities/connector-run-file.entity';
import { CONNECTOR_RUN_THRESHOLDS } from '../connector-run-thresholds';
import { DuckDBConnection } from '@duckdb/node-api';

/** Guard against runaway recursion on a misbehaving (e.g. symlink-looped) server tree. */
const MAX_LISTING_DEPTH = 25;

/**
 * How many listed files go into one discovery upsert. Much larger than the
 * export path's UPSERT_CHUNK because that statement passes its listing through
 * `unnest` and binds a fixed seven parameters regardless of chunk size, so
 * Postgres's 65535-parameter cap does not apply.
 */
const DISCOVERY_CHUNK = 2000;

/**
 * How many files one ingestion batch claims. This is the number that bounds
 * memory and open operation directories, replacing "however many files the
 * server happens to hold". At roughly 300ms per file it is about a minute of
 * work, which keeps the per-batch reconnect below half a percent of the run.
 */
const DRAIN_BATCH = 200;

/**
 * How many files one batch processes at the same time.
 *
 * A file costs ~0.7ms of transfer and ~75ms of local work, and that local work
 * is native CPU inside DuckDB, executed on a background thread that leaves the
 * event loop free. Processing one file at a time therefore left most of the
 * machine idle, and — worse than the throughput — put every file in a batch
 * behind the slowest one.
 *
 * Four, because that is where measured scaling stops: 1.00x / 1.64x / 2.38x at
 * K=1/2/4, then flat at 2.37x and 2.39x for K=6 and K=8.
 *
 * That ceiling is NODE's, not DuckDB's. `@duckdb/node-api` dispatches each
 * query onto a libuv thread-pool thread, and that pool holds four threads
 * unless `UV_THREADPOOL_SIZE` says otherwise — so a fifth concurrent query
 * queues in Node before DuckDB ever sees it. Measured directly, threads=1 with
 * eight connections: 3.65 cores busy and 34 queries/s on the default pool,
 * against 5.77 cores and 42 queries/s at UV_THREADPOOL_SIZE=16. Raising K above
 * four is therefore pointless until that variable is raised too, and four
 * happens to match the default exactly.
 *
 * An earlier version of this note blamed DuckDB's task scheduler, on the
 * assumption that `threads` is a single pool shared by every connection. It is
 * not: `threads` bounds the parallelism of ONE query (threads=2 measured 1.97
 * cores on one parallelisable query), and concurrent queries add to each other
 * beyond it (threads=1 with four connections measured 3.4-3.6 cores, not one).
 *
 * Four also keeps within the Postgres pool: four concurrent import transactions
 * out of a default maximum of ten leaves six for the rest of the API.
 *
 * Safe at this value, but only because of how the transform is written. Two
 * rules hold it up, both in the note on `DuckDBUtils.createTableFromFile`:
 * every working table is named from `crypto.randomUUID()`, so two workers never
 * contend for a catalog entry; and no index-creating DDL (`SET NOT NULL`,
 * `PRIMARY KEY`, `UNIQUE`, `CREATE INDEX`) is issued after rows in a table have
 * been updated or deleted, because DuckDB keeps the old row versions until no
 * transaction can refer to them, which under concurrency is never. Break either
 * rule and files fail in bulk rather than occasionally — measured at 160 of 160
 * for the second one. Tables do NOT need to be `TEMP`; an earlier version of
 * this note said they did, before the two rules above were understood.
 *
 * Verified at this setting: 720 of 720 files transformed correctly with four
 * workers and an idle open transaction alongside them.
 *
 * Outstanding work, in the order it is worth doing. DuckDB's `threads` is left
 * at its default, the host's core count, so each of the four workers asks for
 * the whole machine: 32 threads' worth of demand on eight cores, paid in
 * context switches and evicted caches rather than in throughput. Isolated
 * measurement on an eight-core host for small files: threads=8/K=1 859 files/min,
 * threads=8/K=4 2544, threads=1/K=4 3868 — so asking for LESS per query is
 * worth about 50% here. `threads` belongs to the instance and `SET LOCAL` is
 * not implemented for it, so it cannot be lowered for these workers alone
 * without also crippling large imports on the shared connection.
 */
const INGEST_CONCURRENCY = 4;


/**
 * Consecutive download failures that end a batch early. A genuine run of this
 * many bad files in a row is vanishingly rare; a dropped socket produces it
 * immediately. Aborting stops a dead connection marching through the whole
 * backlog marking every remaining file failed, which would be worse than
 * crashing. The next batch opens a fresh connection and retries the rows this
 * one never claimed.
 */
const MAX_CONSECUTIVE_DOWNLOAD_FAILURES = 10;

/**
 * Consecutive aborted batches that produced no successful file before the whole
 * run gives up. One can happen on a transient; two in a row means the server is
 * gone or the credentials were revoked mid-run. Failing here leaves everything
 * unclaimed still `pending`, so the next run resumes rather than restarting.
 */
const MAX_BARREN_BATCHES = 2;

/**
 * How many failed files in one run may keep their operation directory.
 *
 * A retained directory is four directories plus the downloaded file, so a run
 * where a misconfigured source spec fails tens of thousands of files would
 * consume hundreds of thousands of inodes before any cleanup sweep runs. That
 * is the original production incident, reachable again through a different
 * door.
 *
 * Past this budget a failure is still recorded in full, with its error, and
 * still counts — only the directory is dropped. Nothing is stopped and no
 * successful work is discarded, because a run that fails many files is usually
 * still ingesting many others. The run's failed count, already coloured red in
 * the log list, is the signal that something is systematically wrong; this
 * constant only bounds what that situation can cost the filesystem.
 */
const MAX_RETAINED_OPERATION_DIRS = 500;

/**
 * One open connection to a file server, protocol-agnostic, held for the length
 * of a single ingestion batch. Opening per batch rather than per run bounds what
 * a dropped connection can damage to the batch holding it, and needs no
 * reconnect logic: rows the aborted batch never settled are still `pending`, so
 * the next batch simply claims them again.
 */
interface FileServerSession {
    downloadFile(remotePath: string, localPath: string): Promise<void>;
    close(): Promise<void>;
}

/** One ingestion batch's outcome, rolled up for the run and per spec. */
interface BatchProgress {
    succeeded: number;
    failed: number;
    processMs: number;
    /** Files that arrived with no bytes — settled without being transformed. */
    empty: number;
    /** Transfer time for this batch. Worker time, and overlapped with processing. */
    transferMs: number;
    /** Keyed by `connector_specification_bindings.id`. */
    bySpec: Map<number, RunSpecProgress>;
    /** Failures in this batch that kept their operation directory. */
    retained: number;
    /** The batch stopped early — connection lost, or the connector was disabled. */
    aborted: boolean;
}

@Injectable()
export class ConnectorImportProcessorService {
    private readonly logger: Logger = new Logger(ConnectorImportProcessorService.name);

    constructor(
        private fileIOService: FileIOService,
        private connectorService: ConnectorSpecificationsService,
        private connectorRunService: ConnectorRunService,
        private observationImportService: ObservationImportService,
        private runFileService: ConnectorRunFileService,
        private runSpecService: ConnectorRunSpecService,

    ) { }

    /**
     * Discard a connector's outstanding work when an edit changes what that work
     * means.
     *
     * Discovery is skipped entirely while a backlog exists, so without this a
     * spec change would not take effect until the backlog drained — and every
     * remaining file would be imported under the mapping it was discovered with:
     * the old source specification, the old station. With a large first run that
     * is hours of quietly wrong imports. Worse, if the edit removed a source
     * specification, `processFileForImport` throws `NotFoundException` on every
     * one of the remaining files, turning the rest of the backlog into failures.
     *
     * Only the specification list matters. Renaming a connector, changing its
     * cron or its timeout leaves every queued row still correct, and discarding a
     * backlog then would cost a needless re-listing.
     */
    @OnEvent('connector.updated')
    public async handleConnectorUpdated(event: {
        id: number;
        viewDto: ViewConnectorSpecificationModel;
        previousParameters?: unknown;
    }): Promise<void> {
        if (event.viewDto.connectorType !== ConnectorTypeEnum.IMPORT) {
            return;
        }

        const before: string = this.fingerprintSpecifications(event.previousParameters);
        const after: string = this.fingerprintSpecifications(event.viewDto.parameters);
        if (before === after) {
            return;
        }

        try {
            const discarded: number = await this.runFileService.discardPending(event.id);
            if (discarded > 0) {
                this.logger.log(`Connector ${event.viewDto.name}: specifications changed, discarded ${discarded} queued file(s). The next run re-lists and re-queues them under the new mapping.`);
            }

            // The work is gone, so any run still going has nothing left to do
            // and its snapshot describes a plan that no longer exists. Left
            // alone it would drain dry within a batch and be marked FINISHED,
            // claiming it completed work that was taken away from it. Cancel it
            // instead, which is also what frees the connector's active-run slot
            // so the next tick can start a run under the new specifications.
            const active = await this.connectorRunService.findActive(event.id);
            if (active) {
                await this.connectorRunService.cancel(active.id);
                this.logger.log(`Connector ${event.viewDto.name}: cancelled run ${active.id}, whose plan the edit invalidated. The next run lists again under the new specifications.`);
            }
        } catch (error) {
            // An edit must not fail because the ledger could not be tidied or a
            // run could not be stopped. The cost of getting here is a backlog
            // draining under the old mapping, which is what happened before
            // this existed.
            this.logger.error(`Could not discard queued files or stop the active run for connector ${event.id} after a specification change: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * What a run's plan depends on, reduced to a comparable string: which
     * binding reads which pattern with which source specification for which
     * station. Sorted, so reordering the list in the UI is not mistaken for a
     * change.
     *
     * The binding id leads, so that removing one binding and adding another
     * registers as a change even when the two describe the same files — they are
     * different bindings, with different ledgers, and the queued rows carry the
     * old one's id.
     *
     * `disabled` is part of it for a reason that is easy to miss: disabling only
     * stops DISCOVERY. Rows already queued under that binding are claimed by
     * run id, not by binding, so a backlog would go on draining and go on
     * erroring — possibly for hours — and the sysadmin who just switched it off
     * would see nothing happen. Counting the toggle as a specification change
     * routes it into `discardPending` below, which is the right reading anyway:
     * a pending row is a plan, and disabling the binding invalidates the plan.
     */
    private fingerprintSpecifications(parameters: unknown): string {
        const specs = (parameters as ImportFileServerParametersDto | undefined)?.specifications;
        if (!Array.isArray(specs)) {
            return '';
        }
        return specs
            .map(spec => `${spec.id ?? 0}|${spec.disabled ? 'off' : 'on'}|${spec.specificationId}|${spec.stationId ?? ''}|${spec.filePattern}|${(spec.excludePatterns ?? []).join(',')}`)
            .sort()
            .join(';');
    }

    /**
     * Run one import cycle on an already-queued run: discover what needs doing,
     * then drain it.
     *
     * The two phases are deliberately separate and never share an execution's
     * worth of state. Discovery lists the server and records what needs work as
     * `pending` rows; it downloads and processes nothing. Ingestion then claims
     * those rows a page at a time. Nothing proportional to the server's file
     * count is ever held in memory, which is what a first run against a
     * directory holding hundreds of thousands of files requires.
     *
     * A run interrupted mid-drain comes back here as the *same* row, which is
     * what makes retry and resume one act: its snapshot is already recorded, so
     * discovery is skipped and the drain picks up exactly where it stopped.
     */
    public async processRun(run: ConnectorRunEntity): Promise<void> {
        const connector: ViewConnectorSpecificationModel = this.connectorService.find(run.connectorId, false);

        // Disabled between being queued and being dispatched — by an edit, or
        // by the toggle, while this run sat in the queue. Stop before listing:
        // a listing is the expensive half of a run, and a disabled connector
        // must not touch the server at all. Cancelled rather than finished for
        // the same reason as mid-drain: nothing was done.
        if (connector.disabled) {
            this.logger.warn(`Connector ${connector.name} is disabled; cancelling queued run ${run.id} instead of listing the server`);
            await this.connectorRunService.cancel(run.id);
            return;
        }

        if (run.discoveredAt) {
            this.logger.log(`Run ${run.id} for connector: ${connector.name} already holds a snapshot; resuming ingestion without re-listing`);
        } else {
            this.logger.log(`Run ${run.id} for connector: ${connector.name} has no snapshot; listing the server to discover what needs work`);
            await this.runDiscovery(connector, run);
        }

        this.logger.log(`Run ${run.id} for connector: ${connector.name} starting ingestion of the backlog`);
        await this.drainBacklog(connector, run.id, run.entryUserId);
    }

    /**
     * Phase one. List the targeted directories and record everything that needs
     * work as `pending` rows against this run.
     *
     * Stamps `discovered_at` only once every chunk of every spec has landed.
     * That timestamp is what marks the run as holding a usable snapshot, and the
     * next run's change detection joins against the newest run that has one — so
     * setting it early would let a half-recorded listing become the baseline, and
     * every file it never got to would look new.
     */
    private async runDiscovery(connector: ViewConnectorSpecificationModel, run: ConnectorRunEntity): Promise<void> {
        // A previous attempt at this run may have died partway through recording.
        // Those rows describe an incomplete view of the server, so they are
        // dropped rather than resumed: listing takes seconds, while draining a
        // partial set means importing files that the next run would have to
        // import again anyway, since a run without `discovered_at` can never
        // serve as a baseline.
        const stale = await this.connectorRunService.discardSnapshot(run.id);
        if (stale.files > 0 || stale.specs > 0) {
            this.logger.warn(`Run ${run.id} for connector: ${connector.name}: discarded ${stale.files} file record(s) and ${stale.specs} specification record(s) from an interrupted discovery; listing again`);
        }

        // Timed, not just logged: this is the walk of the server's directories,
        // which on a large file server is a third of the run and is charged to no
        // specification. Stored on the run below — see ConnectorRunEntity.listingMs.
        const startTime: number = Date.now();
        this.logger.log(`Run ${run.id} for connector: ${connector.name}: listing files on the server to discover what needs work`);
        let remoteFiles: FileMetadataVo[];
        switch (connector.serverType) {
            case ServerTypeEnum.FILE_SERVER:
                remoteFiles = await this.listFromFileServer(connector);
                break;
            case ServerTypeEnum.WEB_SERVER:
                remoteFiles = []; // TODO
                break;
            default:
                throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
        }
        const listingMs: number = Date.now() - startTime;
        this.logger.log(`Run ${run.id} for connector: ${connector.name}: listed ${remoteFiles.length} file(s). Time taken: ${listingMs} milliseconds`);

        // The baseline to compare against, resolved PER BINDING rather than once
        // for the connector.
        //
        // A connector-wide baseline is "the newest run that reached the
        // server", and it is wrong the moment a binding can be switched off: a
        // binding that was disabled for that run has no rows in it, so every
        // one of its files would look new and re-enabling would re-import all
        // of them. Asking per binding lands on the last run that actually read
        // each one. See ConnectorRunSpecService.findBaselineRunIds.
        //
        // A binding absent from the map has no usable baseline — a first run, or
        // one that has never once connected — and everything it matches is
        // correctly pending.
        const baselineRunIds: Map<number, number> = await this.runSpecService.findBaselineRunIds(
            connector.parameters.specifications.map(spec => spec.id ?? 0),
            run.id,
        );

        // Discovery returns the rows it will insert, already in their stored
        // shape — no intermediate type and no remapping loop.
        const specRecords: RunSpecInsert[] = await this.recordDiscoveredFiles(
            connector,
            remoteFiles,
            run.id,
            baselineRunIds);

        await this.runSpecService.recordBatch(specRecords);

        // `discoveredAt` last, and only after the spec rows are written: the
        // snapshot is complete only now, and those rows are what the run's
        // totals are summed from. A listing that returned nothing is still a
        // complete snapshot — of an empty directory — and is stamped normally.
        //
        // Deliberately does NOT stamp `endedAt`. Discovery finishing
        // is not the run finishing — the drain that follows it can last hours —
        // and writing an end time here made a still-running run display one, and
        // made its duration negative once a later resume re-stamped the start.
        // The end time belongs to the terminal transition alone: markFinished,
        // markFailed or cancel, all of which set it.
        await this.connectorRunService.update(run.id, {
            discoveredAt: new Date(),
            listingMs,
        });

        // Both totals for the log come off the rows just written, so discovery
        // does not have to carry them back. "Queued" is not a stored column: it
        // is what is left of `matched` once the outcomes discovery settled itself
        // are taken off it — the same identity the run list uses for its Queued
        // column.
        const queued: number = specRecords.reduce((total, r) => total + (r.matchedCount - r.skippedCount - r.emptyCount), 0);
        const unchanged: number = specRecords.reduce((total, r) => total + r.skippedCount, 0);
        this.logger.log(`Discovery for connector ${connector.name} took ${listingMs} ms to list, queued ${queued} file(s) for ingestion, skipped ${unchanged} unchanged`);
    }

    /**
     * Phase two. Claim and ingest `pending` rows until the run has none left.
     *
     * Each batch gets its own connection, so a dropped socket costs one batch
     * rather than the remainder of the backlog. Counters are pushed to the log
     * and the spec rows after every batch rather than accumulated in memory, so
     * a process that dies mid-drain leaves correct partial totals behind and the
     * next execution picks up exactly where this one stopped.
     *
     * However this exits — drained dry, connector disabled, or thrown — the
     * counters are reconciled against the run's own rows on the way out. The
     * per-batch increments are a separate statement from the settles they
     * describe, so they can drift low; the rows cannot.
     */
    private async drainBacklog(
        connector: ViewConnectorSpecificationModel,
        runId: number,
        userId: number): Promise<void> {
        const startTime: number = Date.now();
        this.logger.log(`Ingesting queued files for connector: ${connector.name} (run ${runId})`);

        let drained = 0;
        let barrenBatches = 0;

        // Read once rather than per batch, and from the run's own rows, so a
        // resumed drain inherits what earlier attempts already retained instead of
        // starting the budget over.
        let retained: number = await this.runFileService.countRetainedFailures(runId);
        let budgetWarned: boolean = false;

        try {
            for (; ;) {
                // Re-read the connector every batch. A multi-hour drain is exactly
                // the situation where a sysadmin needs to be able to stop a runaway,
                // and the metadata cache refreshes on update, so the flag flip is
                // visible here.
                if (this.isConnectorStopped(connector.id)) {
                    this.logger.warn(`Connector ${connector.name} was disabled or removed mid-run; cancelling run ${runId}. ${drained} file(s) ingested, the rest stay queued`);
                    // CANCELLED, not FINISHED. Returning normally hands control
                    // back to the dispatcher, which marks the run finished —
                    // and a run that stopped with a backlog still queued did
                    // not finish anything. `markFinished` refuses to overwrite
                    // a cancelled run, so writing the status here is what makes
                    // the dispatcher's call a no-op.
                    await this.connectorRunService.cancel(runId);
                    return;
                }

                // Cancelling a run only writes its status — nothing interrupts a
                // handler already running — so a drain that can last hours has to
                // come looking. Once per batch rather than per file: the check is
                // an indexed count, but so is claiming 200 files, and a sysadmin
                // cancelling does not need sub-second precision.
                if (await this.connectorRunService.isCancelled(runId)) {
                    this.logger.warn(`Run ${runId} for connector ${connector.name} was cancelled; stopping. ${drained} file(s) ingested, the rest stay queued for the next run`);
                    return;
                }

                const batch: ClaimedRunFile[] = await this.runFileService.claimPending(runId, DRAIN_BATCH);
                if (batch.length === 0) {
                    break;
                }

                const progress: BatchProgress = await this.ingestBatch(
                    connector, runId, batch, userId, Math.max(0, MAX_RETAINED_OPERATION_DIRS - retained),
                );
                this.logger.log(`Ingested ${progress.succeeded} file(s) and failed ${progress.failed} file(s) from connector ${connector.name} (run ${runId})`);

                retained += progress.retained;

                if (retained >= MAX_RETAINED_OPERATION_DIRS && !budgetWarned) {
                    budgetWarned = true;
                    this.logger.warn(`Connector ${connector.name} (run ${runId}) has retained ${retained} failed operation directories. Further failures will be recorded without keeping their downloaded file, to protect the filesystem. This many failures usually means a source specification or adapter needs attention.`);
                }

                // Only the spec tier is incremented. The run's totals are summed
                // from these rows when it is read, so there is no second UPDATE
                // here — which also takes one round-trip per batch out of a path
                // that runs ~1,400 times in a large run.
                await this.runSpecService.addProgress(runId, progress.bySpec);

                drained += progress.succeeded + progress.failed;

                // A batch that aborted without ingesting anything is the signature of
                // a connection that is no longer usable. One can be a transient; two
                // in a row is the server being gone. Throwing fails the run and
                // leaves every unclaimed row pending for the next one.
                if (progress.aborted && progress.succeeded === 0) {
                    barrenBatches++;
                    if (barrenBatches >= MAX_BARREN_BATCHES) {
                        throw new Error(`Connector ${connector.name}: ${barrenBatches} consecutive batches ingested nothing before aborting. Stopping; ${drained} file(s) ingested this run, the remainder stay queued.`);
                    }
                } else {
                    barrenBatches = 0;
                }
            }
        } finally {
            // Reconcile however we leave: drained dry, disabled mid-run, or
            // thrown. The rows are authoritative and the counters are a cache
            // over them, so this repairs any drift the per-batch increments
            // accumulated and leaves a partial run reporting exactly what it
            // actually did. Best-effort — a failure here must not mask the
            // error that caused the drain to stop.
            try {
                await this.runSpecService.reconcileFromRunFiles(runId);
            } catch (error) {
                this.logger.warn(`Could not reconcile counters for run ${runId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        this.logger.log(`Completed ingesting files for connector ${connector.name} (run ${runId}). ${drained} file(s), time taken: ${Date.now() - startTime} milliseconds`);
    }

    /**
     * Ingest one claimed page: download, process, import, settle, release.
     *
     * Files are processed `INGEST_CONCURRENCY` at a time, each on its own
     * DuckDB connection, but transfers are serialised onto a single
     * file-server session held for the batch. Every file is still settled
     * individually, so an interruption costs at most the files actually in
     * flight rather than the whole batch.
     *
     * Two alternatives were built and measured against this one on a LAN SFTP
     * server (~1ms per transfer, ~138ms of local work per file):
     *
     *   download the whole batch first, then process   +4.6% slower, 9/10 batches
     *   one session per worker (concurrent transfers)   -0.4%, 4/12 batches — no effect
     *
     * Neither helped, for the same reason: at LAN latency the session is busy
     * about 3% of the time, so there is no transfer queue to remove.
     * Download-first is actively worse because it stops transfers hiding
     * inside processing — it makes the batch cost
     * `transfers + processing/K` instead of `max(transfers, processing/K)`.
     *
     * TODO: none of this has been measured against a WAN file server, only a
     * LAN one. The conclusion above is expected to invert once a transfer
     * costs more than `avg_process_ms / INGEST_CONCURRENCY` (~34ms today),
     * because the single session then becomes the bottleneck rather than idle
     * 97% of the time. If a WAN deployment shows `connector_run_files.
     * last_transfer_ms` climbing towards that figure, the fix is a session per
     * worker so transfers run concurrently — that variant was written, tested
     * and shown correct here, and would be reintroduced as a per-connector
     * setting rather than a global default, since it costs
     * INGEST_CONCURRENCY simultaneous connections against the operator's
     * server and FTP servers commonly cap those. Do NOT reach for the
     * download-the-batch-first shape; it was measured slower in every
     * environment modelled, and its one benefit (releasing the session early)
     * disappears on WAN, where the transfers themselves are what hold it.
     */
    private async ingestBatch(
        connector: ViewConnectorSpecificationModel,
        runId: number,
        batch: ClaimedRunFile[],
        userId: number,
        retentionBudget: number,
    ): Promise<BatchProgress> {
        const progress: BatchProgress = {
            succeeded: 0,
            failed: 0,
            empty: 0,
            processMs: 0,
            transferMs: 0,
            bySpec: new Map(),
            retained: 0,
            aborted: false,
        };

        const workerCount: number = Math.max(1, Math.min(INGEST_CONCURRENCY, batch.length));
        const conns: DuckDBConnection[] = [];

        let consecutiveDownloadFailures = 0;
        const session: FileServerSession = await this.openFileServerSession(connector);

        // The transfer lock. One `downloadChain` exists per batch and every
        // worker closes over this same variable — that sharing *is* the lock,
        // nothing else enforces it. Each call chains its work after whatever
        // is already queued, then becomes the new tail.
        //
        // What it guards is the function passed to `enqueueDownload` below,
        // not the code around the call. Everything before the call (creating
        // the operation directory, building paths) and everything after it
        // (settling, transforming, loading) still runs concurrently across
        // workers; only the callback is exclusive. It guards two pieces of
        // shared state: the file-server session, which is a single channel
        // that is unsafe for concurrent reads, and
        // `consecutiveDownloadFailures`.
        //
        // An acquire/release mutex, or wrapping the session so `downloadFile`
        // serialises itself, would both work identically — this shape was
        // kept only because it is the smallest.
        //
        // `.catch()` on the tail is load-bearing, not defensive tidying. It
        // keeps the invariant that the tail is always *resolved*, so the next
        // `.then(fn)` is guaranteed to run. Assigning the raw result instead
        // (`downloadChain = result`) poisons the queue: one failed transfer
        // makes every later one inherit that rejection and never execute, so
        // the rest of the batch is silently skipped rather than downloaded.
        let downloadChain: Promise<unknown> = Promise.resolve();
        const enqueueDownload = <T>(fn: () => Promise<T>): Promise<T> => {
            const result: Promise<T> = downloadChain.then(fn);
            downloadChain = result.catch(() => { });
            return result;
        };

        try {
            for (let i = 0; i < workerCount; i++) {
                conns.push(await this.fileIOService.createDuckDbConnection());
            }

            // Shared cursor. Workers pull the next index rather than being
            // dealt fixed slices, so one slow file never leaves a worker idle
            // while another still has a queue behind it.
            let nextIndex: number = 0;

            const worker = async (conn: DuckDBConnection): Promise<void> => {
                for (; ;) {
                    if (progress.aborted || this.isConnectorStopped(connector.id)) {
                        progress.aborted = true;
                        return;
                    }

                    const index: number = nextIndex++;
                    if (index >= batch.length) {
                        return;
                    }

                    const item: ClaimedRunFile = batch[index];
                    const stats = this.statsFor(progress, item);
                    const op: OperationContext = await this.fileIOService.createOperation();
                    const inputFilePathName: string = path.posix.join(op.inputDir, path.basename(item.remotePath));

                    // Critical section: exactly one worker is inside this
                    // callback at a time (see `enqueueDownload` above). The
                    // failure counter is updated in here, not after the await,
                    // so it counts consecutive failures in transfer order
                    // rather than interleaving four workers' outcomes.
                    const transfer = await enqueueDownload(async () => {
                        const result = await this.downloadOne(session, item, inputFilePathName);
                        consecutiveDownloadFailures = result.error === null ? 0 : consecutiveDownloadFailures + 1;
                        return result;
                    });

                    // Counted here, once, rather than in each of the three
                    // settle paths below — every transfer is charged whether it
                    // succeeded, failed, or turned out to be an empty file,
                    // which matches what last_transfer_ms records per row.
                    progress.transferMs += transfer.transferMs;
                    stats.transferMs += transfer.transferMs;

                    if (transfer.error !== null) {
                        await this.settleDownloadFailure(runId, item, op, transfer, progress, stats);
                        if (consecutiveDownloadFailures >= MAX_CONSECUTIVE_DOWNLOAD_FAILURES) {
                            this.logger.error(`Connector ${connector.name}: ${consecutiveDownloadFailures} consecutive download failures; abandoning this batch. The connection is most likely gone.`);
                            progress.aborted = true;
                            return;
                        }
                        continue;
                    }

                    // Checked here, between the transfer and the transform, so
                    // an empty file costs one download rather than a download
                    // plus an adapter run plus a DuckDB pipeline that can only
                    // fail. See RunFileStatusEnum.EMPTY for why it is not a
                    // failure.
                    if (await this.settleIfEmpty(runId, item, op, inputFilePathName, transfer.transferMs, progress, stats)) {
                        continue;
                    }

                    await this.processOne(conn, runId, item, op, inputFilePathName, transfer.transferMs, userId, progress, stats, retentionBudget);
                }
            };

            await this.runWorkers(connector, runId, conns, worker, progress);
        } finally {
            for (const conn of conns) {
                conn.disconnectSync();
            }
            await session.close();
        }

        return progress;
    }

    /** Runs one worker per connection, tolerating an unexpected worker failure. */
    private async runWorkers(
        connector: ViewConnectorSpecificationModel,
        runId: number,
        conns: DuckDBConnection[],
        worker: (conn: DuckDBConnection) => Promise<void>,
        progress: BatchProgress,
    ): Promise<void> {
        // A worker that throws unexpectedly must not abandon the files the
        // others are still settling, so failures are logged and the batch
        // completes normally; whatever was never claimed stays pending.
        const outcomes = await Promise.allSettled(conns.map((conn) => worker(conn)));
        for (const outcome of outcomes) {
            if (outcome.status === 'rejected') {
                progress.aborted = true;
                this.logger.error(`Connector ${connector.name} (run ${runId}): ingestion worker failed: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`);
            }
        }
    }

    /**
     * Progress bucket for one BINDING, keyed by its id.
     *
     * Previously keyed by what the binding pointed at, which merged bindings
     * sharing a specification (and later, a specification and a station) into
     * one bucket and left the others reporting zero. The id cannot merge.
     */
    private statsFor(progress: BatchProgress, item: ClaimedRunFile): RunSpecProgress {
        let stats = progress.bySpec.get(item.bindingId);
        if (!stats) {
            stats = {
                bindingId: item.bindingId,
                succeeded: 0, failed: 0, empty: 0, observationRows: 0, processMs: 0, transferMs: 0,
            };
            progress.bySpec.set(item.bindingId, stats);
        }
        return stats;
    }

    /** One transfer. Never throws; the error is returned alongside its timing. */
    private async downloadOne(
        session: FileServerSession,
        item: ClaimedRunFile,
        inputFilePathName: string,
    ): Promise<{ transferMs: number; error: string | null }> {
        const start: number = Date.now();
        try {
            await session.downloadFile(item.remotePath, inputFilePathName);
            return { transferMs: Date.now() - start, error: null };
        } catch (error) {
            return { transferMs: Date.now() - start, error: error instanceof Error ? error.message : String(error) };
        }
    }

    private async settleDownloadFailure(
        runId: number,
        item: ClaimedRunFile,
        op: OperationContext,
        transfer: { transferMs: number; error: string | null },
        progress: BatchProgress,
        stats: RunSpecProgress,
    ): Promise<void> {
        const errorMessage = `Failed to download file ${item.remotePath}: ${transfer.error}`;
        this.logger.error(errorMessage);

        // Nothing useful landed — don't retain an empty operation dir.
        await this.fileIOService.deleteOperation(op.operationId);
        await this.runFileService.settle(runId, item, {
            status: RunFileStatusEnum.FAILED,
            errorMessage,
            operationId: null,
            processMs: null,
            transferMs: transfer.transferMs,
        });
        progress.failed++;
        stats.failed++;
    }

    /**
     * Settle a downloaded file that turned out to hold no bytes, and report
     * whether it did.
     *
     * A zero-byte file is a routine fact of automatic-station operation — a
     * logger writing its scheduled file while the instruments are disconnected,
     * during maintenance or a test — so it is recorded as its own outcome
     * rather than as a failure. See RunFileStatusEnum.EMPTY.
     *
     * The operation directory is dropped rather than retained: there is by
     * definition nothing in it to inspect, and the retention budget exists for
     * failures that need a human to look at the bytes.
     *
     * A stat failure here is deliberately not treated as empty — it falls
     * through to the normal transform path, which will produce a real error
     * about a file it could not read.
     */
    private async settleIfEmpty(
        runId: number,
        item: ClaimedRunFile,
        op: OperationContext,
        inputFilePathName: string,
        transferMs: number,
        progress: BatchProgress,
        stats: RunSpecProgress,
    ): Promise<boolean> {
        let size: number;
        try {
            size = (await fs.promises.stat(inputFilePathName)).size;
        } catch {
            return false;
        }

        if (size > 0) {
            return false;
        }

        // Nothing landed, so there is nothing to inspect either way.
        await this.fileIOService.deleteOperation(op.operationId);

        // Zero bytes on disk has two very different causes, and the server's
        // own listing is what tells them apart. If the listing also said zero,
        // the file really is empty. If it said 500 bytes and we got none, the
        // transfer was truncated — real data that must be retried, not written
        // off. Observed live: 46 files listed at 368-1234 bytes arrived empty.
        //
        // A null listed size means the server reported none, so we cannot rule
        // out a truncated transfer and treat it as one. Retrying an empty file
        // costs one transfer; freezing a truncated one loses the data forever.
        const genuinelyEmpty: boolean = item.fileSize === 0;

        if (!genuinelyEmpty) {
            const errorMessage = `Downloaded 0 bytes for ${item.remotePath}, but the server listed it as `
                + `${item.fileSize === null ? 'an unknown size' : `${item.fileSize} bytes`}. `
                + `Treating this as a truncated transfer rather than an empty file, so it will be retried.`;
            this.logger.warn(errorMessage);
            await this.runFileService.settle(runId, item, {
                status: RunFileStatusEnum.FAILED,
                errorMessage,
                operationId: null,
                processMs: null,
                transferMs,
            });
            progress.failed++;
            stats.failed++;
            return true;
        }

        await this.settleEmpty(runId, item, 'The file was downloaded successfully but contained no data (0 bytes).', null, transferMs, progress, stats);
        return true;
    }

    /**
     * Settle one file as `empty`: it held nothing to import, and nothing is
     * wrong. Reached two ways — a zero-byte download, and a file whose content
     * transformed to no observations (no data rows, or every value missing).
     *
     * The message is not an error, but the row is the only place a sysadmin
     * sees this, so it says plainly what was found instead of leaving it blank.
     */
    private async settleEmpty(
        runId: number,
        item: ClaimedRunFile,
        message: string,
        processMs: number | null,
        transferMs: number,
        progress: BatchProgress,
        stats: RunSpecProgress,
    ): Promise<void> {
        await this.runFileService.settle(runId, item, {
            status: RunFileStatusEnum.EMPTY,
            errorMessage: message,
            operationId: null,
            processMs,
            transferMs,
        });
        progress.empty++;
        stats.empty++;
        if (processMs !== null) {
            progress.processMs += processMs;
            stats.processMs += processMs;
        }
    }

    /** Transform one already-downloaded file and load it, then settle. */
    private async processOne(
        conn: DuckDBConnection,
        runId: number,
        item: ClaimedRunFile,
        op: OperationContext,
        inputFilePathName: string,
        transferMs: number,
        userId: number,
        progress: BatchProgress,
        stats: RunSpecProgress,
        retentionBudget: number,
    ): Promise<void> {
        const processStart: number = Date.now();
        try {
            const result: FileProcessingError | void = await this.observationImportService.processFileForImport(
                item.specificationId, inputFilePathName, op.intermediateDir, op.outputDir, userId, item.stationId, conn,
            );

            if (result) {
                // Nothing to import and nothing wrong — the file had no data rows,
                // or every value in it was missing. The same standing as a
                // zero-byte file, so the same outcome: `empty`, not a failure.
                // Every other error, a datetime format that matched no row
                // included, is a real failure and stays retryable.
                if (result.type === FileProcessingErrorType.NO_DATA) {
                    await this.fileIOService.deleteOperation(op.operationId);
                    await this.settleEmpty(runId, item, result.message, Date.now() - processStart, transferMs, progress, stats);
                    return;
                }
                await this.failFile(runId, item, progress, stats, result.message, op.operationId, Date.now() - processStart, transferMs, retentionBudget);
                return;
            }

            const outputFiles: string[] = await fs.promises.readdir(op.outputDir);
            if (outputFiles.length === 0) {
                await this.failFile(runId, item, progress, stats, 'No files produced by processing', op.operationId, Date.now() - processStart, transferMs, retentionBudget);
                return;
            }

            const dbProcessedFilePathName = path.posix.join(op.dbOutputDir, outputFiles[0]);
            const observationRows: number = await this.observationImportService.importProcessedFileToDatabase(dbProcessedFilePathName);

            const processMs: number = Date.now() - processStart;
            await this.runFileService.settle(runId, item, {
                status: RunFileStatusEnum.SUCCESS,
                processMs,
                transferMs,
                observationRows,
            });
            progress.succeeded++;
            progress.processMs += processMs;
            stats.succeeded++;
            stats.observationRows += observationRows;
            stats.processMs += processMs;

            // Success: the operation directory is transient scratch space now
            // that the rows are in Postgres — delete it. Failed files keep
            // theirs (operationId recorded above) for inspection.
            await this.fileIOService.deleteOperation(op.operationId);

        } catch (error) {
            const raw: string = error instanceof Error ? error.message : String(error);
            const errorMessage = `Failed to process file ${item.remotePath}: ${raw}`;
            this.logger.error(errorMessage);
            await this.failFile(runId, item, progress, stats, errorMessage, op.operationId, Date.now() - processStart, transferMs, retentionBudget);
        }
    }

    /**
     * Settle one file as failed, retaining its operation directory for
     * inspection while the run still has retention budget left.
     *
     * Past the budget the failure is recorded identically — same status, same
     * error, same counts — but the directory is deleted and `operation_id` left
     * null, so a systematically failing run cannot exhaust the filesystem's
     * inodes before a cleanup sweep gets to it. See MAX_RETAINED_OPERATION_DIRS.
     *
     * Called from several workers at once, so the budget slot is claimed
     * synchronously below, before the first `await`. Testing the budget and
     * then incrementing it after awaiting would let every concurrent failure
     * read the same pre-increment value and all retain, overshooting by up to
     * one directory per worker.
     */
    private async failFile(
        runId: number,
        file: ClaimedRunFile,
        progress: BatchProgress,
        stats: RunSpecProgress,
        errorMessage: string,
        operationId: string,
        processMs: number,
        transferMs: number,
        retentionBudget: number,
    ): Promise<void> {
        const retain: boolean = progress.retained < retentionBudget;
        if (retain) {
            progress.retained++;
        }

        if (!retain) {
            await this.fileIOService.deleteOperation(operationId);
        }

        await this.runFileService.settle(runId, file, {
            status: RunFileStatusEnum.FAILED,
            errorMessage,
            operationId: retain ? operationId : null,
            processMs,
            transferMs,
        });

        progress.failed++;
        progress.processMs += processMs;
        stats.failed++;
        stats.processMs += processMs;
    }

    /**
     * Whether the drain should stop. True if the connector has been disabled
     * mid-run, and also if it has been deleted outright — in both cases the
     * remaining queued work should not run.
     */
    private isConnectorStopped(connectorId: number): boolean {
        try {
            return this.connectorService.find(connectorId, false).disabled;
        } catch {
            return true;
        }
    }


    /**
     * List exactly the directories the specs target, then disconnect. Discovery
     * holds a connection for the length of one listing rather than for the whole
     * run, so nothing here is exposed to a long-session drop.
     */
    private async listFromFileServer(connector: ViewConnectorSpecificationModel): Promise<FileMetadataVo[]> {
        switch ((connector.parameters as ImportFileServerParametersDto).protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                return this.listOverFtp(connector);
            case FileServerProtocolEnum.SFTP:
                return this.listOverSftp(connector);
            default:
                throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
        }
    }

    private async listOverFtp(connector: ViewConnectorSpecificationModel): Promise<FileMetadataVo[]> {
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();
        const connectorParams = connector.parameters as ImportFileServerParametersDto;

        let startTime: number = Date.now();
        try {
            this.logger.log(`Connecting to FTP server ${connector.name}`);
            await client.access({
                host: connector.hostName,
                port: connector.parameters.port,
                user: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
                secure: connectorParams.protocol === FileServerProtocolEnum.FTPS,
                secureOptions: connectorParams.protocol === FileServerProtocolEnum.FTPS
                    ? { rejectUnauthorized: false } // Allow self-signed certificates
                    : undefined,
            });
            this.logger.log(`Connecting to FTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);

            // Set the working directory; every path below is relative to it.
            await client.cd(connectorParams.remotePath);

            // List only the directories the specs actually target. A `**` spec
            // walks its subtree; every other spec is one shallow list of its
            // literal dir.
            startTime = Date.now();
            this.logger.log(`Getting file lists from FTP server ${connector.name}`);
            const remoteFiles: FileMetadataVo[] = await this.collectRemoteFiles(
                connectorParams.specifications,
                async (relDir: string) => {
                    const atRoot: boolean = relDir === '.';
                    const items: any[] = atRoot ? await client.list() : await client.list(relDir);
                    const files: FileMetadataVo[] = [];
                    for (const i of items) {
                        if (!i.isFile) continue;
                        files.push(this.toFtpFileMetadata(i, atRoot ? i.name : path.posix.join(relDir, i.name)));
                    }
                    return files;
                },
                async (relDir: string) => {
                    // No root translation needed: this helper's "start here"
                    // sentinel is already '.', the same one collectRemoteFiles
                    // passes. (The SFTP variant has to translate to '', which is
                    // its own sentinel — see listOverSftp.)
                    const items = await this.listFtpFilesRecursively(client, relDir);
                    return items.map((i: any) => this.toFtpFileMetadata(i, i.name));
                },
            );
            this.logger.log(`File lists for FTP server ${connector.name} successfully retrieved. Found ${remoteFiles.length} files and took ${Date.now() - startTime} milliseconds`);
            return remoteFiles;
        } finally {
            client.close();
        }
    }

    private async listOverSftp(connector: ViewConnectorSpecificationModel): Promise<FileMetadataVo[]> {
        const client = new SftpClient();
        const connectorParams = connector.parameters as ImportFileServerParametersDto;

        let startTime: number = Date.now();
        try {
            this.logger.log(`Connecting to SFTP server ${connector.name}`);
            await client.connect({
                host: connector.hostName,
                port: connector.parameters.port,
                username: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password), // Decrypt password
                readyTimeout: connector.timeout ? connector.timeout * 1000 : undefined,
            });
            this.logger.log(`Connecting to SFTP server ${connector.name} took ${Date.now() - startTime} milliseconds`);

            startTime = Date.now();
            this.logger.log(`Getting file lists from SFTP server ${connector.name}`);
            const remotePath = connectorParams.remotePath;
            const remoteFiles: FileMetadataVo[] = await this.collectRemoteFiles(
                connectorParams.specifications,
                async (relDir: string) => {
                    const atRoot: boolean = relDir === '.';
                    const abs = atRoot ? remotePath : path.posix.join(remotePath, relDir);
                    const items: any[] = await client.list(abs);
                    const files: FileMetadataVo[] = [];
                    for (const i of items) {
                        if (i.type !== '-') continue; //  keep only regular files, skip everything else.
                        files.push(this.toSftpFileMetadata(i, atRoot ? i.name : path.posix.join(relDir, i.name)));
                    }
                    return files;
                },
                async (relDir: string) => {
                    // '' is this helper's root sentinel, not '.': it joins
                    // basePath + relativePath, and joining '.' would yield a
                    // trailing "/." instead of the clean base path.
                    const items = await this.listSftpFilesRecursively(client, remotePath, relDir === '.' ? '' : relDir);
                    return items.map((i: any) => this.toSftpFileMetadata(i, i.name));
                },
            );
            this.logger.log(`File lists for SFTP server ${connector.name} successfully retrieved. Found ${remoteFiles.length} files and took ${Date.now() - startTime} milliseconds`);
            return remoteFiles;
        } finally {
            await client.end();
        }
    }

    /**
     * Open a connection for one ingestion batch. Opening per batch instead of
     * per run costs one handshake per couple of hundred files, well under a
     * percent of a long drain, and in exchange a dropped connection can only
     * spoil the batch holding it.
     */
    private async openFileServerSession(connector: ViewConnectorSpecificationModel): Promise<FileServerSession> {
        switch ((connector.parameters as ImportFileServerParametersDto).protocol) {
            case FileServerProtocolEnum.FTP:
            case FileServerProtocolEnum.FTPS:
                return this.openFtpSession(connector);
            case FileServerProtocolEnum.SFTP:
                return this.openSftpSession(connector);
            default:
                throw new Error(`Developer Error. Unsupported server type: ${connector.serverType}`);
        }
    }

    private async openFtpSession(connector: ViewConnectorSpecificationModel): Promise<FileServerSession> {
        const connectorParams = connector.parameters as ImportFileServerParametersDto;
        const client = connector.timeout ? new FtpClient(connector.timeout * 1000) : new FtpClient();

        try {
            await client.access({
                host: connector.hostName,
                port: connector.parameters.port,
                user: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password),
                secure: connectorParams.protocol === FileServerProtocolEnum.FTPS,
                secureOptions: connectorParams.protocol === FileServerProtocolEnum.FTPS
                    ? { rejectUnauthorized: false }
                    : undefined,
            });

            // Load-bearing on every reconnect, not just the first connection.
            // basic-ftp resolves each later path against the working directory,
            // and run-file rows store paths relative to remotePath — so a batch
            // that skipped this would quietly resolve every download against the
            // server's root and fail, or worse, fetch the wrong file.
            await client.cd(connectorParams.remotePath);
        } catch (error) {
            client.close();
            throw error;
        }

        return {
            downloadFile: async (remotePath: string, localPath: string) => {
                await client.downloadTo(localPath, remotePath);
            },
            close: async () => {
                client.close();
            },
        };
    }

    private async openSftpSession(connector: ViewConnectorSpecificationModel): Promise<FileServerSession> {
        const connectorParams = connector.parameters as ImportFileServerParametersDto;
        const client = new SftpClient();

        try {
            await client.connect({
                host: connector.hostName,
                port: connector.parameters.port,
                username: connector.parameters.username,
                password: await EncryptionUtils.decrypt(connector.parameters.password),
                readyTimeout: connector.timeout ? connector.timeout * 1000 : undefined,
            });
        } catch (error) {
            try {
                await client.end();
            } catch {
                // Connect never completed; nothing to tear down.
            }
            throw error;
        }

        return {
            // ssh2-sftp-client is stateless — it has no working directory — so
            // every operation takes the full remote path. That asymmetry is why
            // the FTP session above needs a `cd` and this one does not.
            downloadFile: async (remotePath: string, localPath: string) => {
                await client.get(path.posix.join(connectorParams.remotePath, remotePath), localPath);
            },
            close: async () => {
                await client.end();
            },
        };
    }

    /**
     * Match each spec's pattern against the listing and record what needs work.
     *
     * Nothing is downloaded here and no per-file state survives the loop: each
     * chunk of matches is handed to `markDiscovered`, which classifies it
     * against the previous run inside Postgres and reports back only two counts.
     * That is what replaced holding the whole listing's ledger state, the match
     * set and the download list in memory at once.
     *
     * Every matched file is recorded, not just the ones needing work, so this
     * run's rows end up a complete snapshot of the file server and the next run
     * has something to diff against.
     */
    private async recordDiscoveredFiles(
        connector: ViewConnectorSpecificationModel,
        remoteFiles: FileMetadataVo[],
        runId: number,
        /** Per binding, the run its change detection compares against. */
        baselineRunIds: Map<number, number>,
    ): Promise<RunSpecInsert[]> {
        const connectorParams = connector.parameters as ImportFileServerParametersDto;

        // Index the listing by parent directory, once, so that the per-binding
        // matching below asks "is this directory in scope?" of each DIRECTORY
        // rather than of each file:
        //
        //   'rwanda/KAZO'      -> [ { file, base: '000032202411060940.txt' }, ... ]
        //   'rwanda/NYAGATARE' -> [ ... ]
        //
        // A pattern resolves to a literal directory prefix, so a binding can then
        // skip whole buckets untested. Without this, every binding would walk all
        // ~580k entries and re-derive each one's directory and file name — ten
        // bindings meaning ten passes and 5.8M path parses instead of one pass
        // and 580k. A file server holds hundreds of directories against hundreds
        // of thousands of files, which is the whole saving.
        //
        // `base` is kept rather than recomputed because the filename glob is
        // tested against it, and two bindings may cover the same directory with
        // different patterns, so one file can be tested more than once.
        //
        // One convention worth noticing: `path.posix.dirname('data.csv')` is
        // '.', which is exactly what `parseFilePattern` uses for "the
        // connector's root". So a pattern like `*.csv` lands on the '.' bucket
        // with no special case — the two halves were chosen to line up.
        const byDir = new Map<string, { file: FileMetadataVo; base: string }[]>();
        for (const file of remoteFiles) {
            const dir = path.posix.dirname(file.fileName);
            const entry = { file: file, base: path.posix.basename(file.fileName) };
            const bucket = byDir.get(dir);
            if (bucket) {
                bucket.push(entry);
            } else {
                byDir.set(dir, [entry]);
            }
        }

        const records: RunSpecInsert[] = [];

        for (const spec of connectorParams.specifications) {
            // Switched off: nothing was listed for it (collectRemoteFiles
            // dropped its directory), so there is nothing to match. The row is
            // still written, zero-filled and flagged, so the run history says
            // "this binding was off" rather than silently losing it — and so
            // the baseline lookup knows not to compare against this run.
            if (spec.disabled) {
                records.push(this.emptySpecRecord(runId, spec, true));
                continue;
            }

            // Pattern grammar lives in connector-file-pattern.util.ts. A pattern
            // resolves to a literal directory prefix, a `recursive` flag (a `**`
            // segment), and a basename regex. Non-recursive: match the one
            // bucket keyed by the prefix. Recursive: match the prefix's bucket
            // plus every bucket nested under it.
            //
            // Unguarded on purpose. Both parsers reject at connector-save time
            // (`validateImportFilePatterns`), so a stored pattern that fails
            // here would be a bug in the validator, not sysadmin input — and a
            // throw is the right answer to that: the dispatcher records it as
            // the run's error message, where a sysadmin reads it, rather than a
            // log line saying one binding quietly imported nothing.
            const { literalPrefix, recursive, regex } = parseFilePattern(spec.filePattern);
            const excludeRegex: RegExp | null = parseExcludePatterns(spec.excludePatterns);

            // This binding's own baseline, not the connector's. Absent means no
            // run has covered it yet, and everything it matches is new.
            const bindingId: number = spec.id ?? 0;
            const previousRunId: number | null = baselineRunIds.get(bindingId) ?? null;

            // Everything to the end of this block is what `scanMs` measures: the
            // match pass over the listing plus the round trips that record it.
            // Both scale with how many files sit in this spec's directories, and
            // neither depends on whether anything actually changed — which is
            // precisely the cost that tells a sysadmin a directory has grown too
            // large. The ingestion that follows is measured separately.
            const scanStart = Date.now();
            let scannedCount = 0;
            let excludedCount = 0;
            let matchedCount = 0;
            let pendingCount = 0;
            let emptyCount = 0;
            let chunk: DiscoveredFile[] = [];
            // Excluded files are recorded too — see RunFileStatusEnum.EXCLUDED —
            // in their own chunk, because they take a different statement: a
            // plain insert with no change detection and no work queued.
            let excludedChunk: DiscoveredFile[] = [];

            for (const [dir, entries] of byDir) {
                const inScope = !recursive
                    ? dir === literalPrefix
                    : literalPrefix === '.' || dir === literalPrefix || dir.startsWith(literalPrefix + '/');
                if (!inScope) {
                    continue;
                }
                scannedCount += entries.length;
                for (const e of entries) {
                    if (!regex.test(e.base)) {
                        continue;
                    }
                    // Excluded: recorded as an 'excluded' row and nothing
                    // more — never downloaded, never processed, never queued as
                    // work. The row exists so the exclusion is inspectable in
                    // the run's Files tab rather than the file silently
                    // vanishing from the run.
                    //
                    // Removing an exclusion later still needs no special
                    // handling, though not because the row is absent: the next
                    // run's `markDiscovered` does join it, but 'excluded' is
                    // not one of the statuses that CASE carries forward
                    // ('success', 'skipped', 'empty'), so it falls through to
                    // the ELSE branch and the file is queued as pending.
                    if (excludeRegex !== null && excludeRegex.test(e.base)) {
                        excludedCount++;
                        excludedChunk.push({
                            remotePath: e.file.fileName,
                            fileMtime: e.file.modifiedDate ? new Date(e.file.modifiedDate) : null,
                            fileSize: e.file.size ?? null,
                        });
                        if (excludedChunk.length >= DISCOVERY_CHUNK) {
                            await this.runFileService.markExcluded(
                                connector.id, bindingId, spec.specificationId, spec.stationId, runId, excludedChunk,
                            );
                            excludedChunk = [];
                        }
                        continue;
                    }
                    matchedCount++;
                    chunk.push({
                        remotePath: e.file.fileName,
                        fileMtime: e.file.modifiedDate ? new Date(e.file.modifiedDate) : null,
                        fileSize: e.file.size ?? null,
                    });
                    // Flushed and released as we go, so the match set is never
                    // materialised in full — this loop's footprint is one chunk
                    // regardless of how many files matched.
                    if (chunk.length >= DISCOVERY_CHUNK) {
                        const counts = await this.runFileService.markDiscovered(
                            connector.id, bindingId, spec.specificationId, spec.stationId, runId, previousRunId, chunk,
                        );
                        pendingCount += counts.pending;
                        emptyCount += counts.empty;
                        chunk = [];
                    }
                }
            }

            if (excludedChunk.length > 0) {
                await this.runFileService.markExcluded(
                    connector.id, bindingId, spec.specificationId, spec.stationId, runId, excludedChunk,
                );
                excludedChunk = [];
            }

            // Flush any remaining matches that didn't fill a chunk.
            if (chunk.length > 0) {
                const counts = await this.runFileService.markDiscovered(
                    connector.id, bindingId, spec.specificationId, spec.stationId, runId, previousRunId, chunk,
                );
                pendingCount += counts.pending;
                emptyCount += counts.empty;
                chunk = [];
            }

            // Matched files the previous run had already ingested and that have
            // not changed since. They are recorded as `skipped`, so this is also
            // derivable from the run's rows later; computing it here saves the
            // query.
            //
            // `emptyCount` has to come out of the subtraction. A file carried
            // forward as still-empty is settled at discovery like a skipped one,
            // so leaving it in counted every empty file as unchanged — seen on a
            // live run as a spec reporting 1,312 skipped where the ledger held
            // 903 skipped and 409 empty.
            const skippedCount: number = matchedCount - pendingCount - emptyCount;

            // The row as it will be inserted. Drain-side figures are zero by
            // definition here and accumulate as batches settle, so a run resumed
            // after an interruption still totals correctly.
            const record: RunSpecInsert = {
                connectorRunId: runId,
                bindingId,
                disabled: false,
                specificationId: spec.specificationId,
                stationId: spec.stationId,
                filePattern: spec.filePattern,
                excludePatterns: spec.excludePatterns ?? [],
                scannedCount,
                excludedCount,
                matchedCount,
                skippedCount,
                emptyCount,
                succeededCount: 0,
                failedCount: 0,
                observationRows: 0,
                transferMs: 0,
                processMs: 0,
                scanMs: Date.now() - scanStart,
            };
            records.push(record);
            this.recordScanCost(connector.name, record);

            if (matchedCount === 0) {
                this.logger.warn(`No files found matching pattern ${spec.filePattern} for connector ${connector.name}`);
            } else {
                this.logger.log(`Pattern ${spec.filePattern}: matched ${matchedCount} file(s)${excludedCount > 0 ? ` (${excludedCount} excluded)` : ''}, queued ${pendingCount}, skipped ${skippedCount} unchanged`);
            }
        }

        return records;
    }

    /**
     * A spec row for a binding that did nothing this run: switched off, or its
     * pattern would not parse. Written rather than omitted so the run history
     * says which it was — a missing row is indistinguishable from a binding that
     * was deleted, and from one that scanned a directory and legitimately found
     * nothing. A disabled row also tells `findBaselineRunIds` not to compare
     * against this run.
     */
    private emptySpecRecord(
        runId: number,
        spec: ImportFileServerSpecificationDto,
        disabled: boolean,
    ): RunSpecInsert {
        return {
            connectorRunId: runId,
            bindingId: spec.id ?? 0,
            disabled: disabled,
            specificationId: spec.specificationId,
            stationId: spec.stationId,
            filePattern: spec.filePattern,
            excludePatterns: spec.excludePatterns ?? [],
            scannedCount: 0,
            excludedCount: 0,
            matchedCount: 0,
            skippedCount: 0,
            emptyCount: 0,
            succeededCount: 0,
            failedCount: 0,
            observationRows: 0,
            transferMs: 0,
            processMs: 0,
            scanMs: 0,
        };
    }

    /**
     * Warn in the server log when a spec crosses the red thresholds, so the
     * signal reaches a sysadmin who never opens the connector-logs page. The
     * UI colours the same numbers from the same constants.
     */
    private recordScanCost(connectorName: string, result: RunSpecInsert): void {
        const { scannedCount, scanMs } = CONNECTOR_RUN_THRESHOLDS.spec;

        if (result.scannedCount >= scannedCount.red) {
            this.logger.warn(
                `Connector ${connectorName}: pattern "${result.filePattern}" scanned ${result.scannedCount} files (${result.scanMs}ms). ` +
                `Consider archiving already-processed files out of that directory — this cost is paid on every run whether or not anything changed.`,
            );
        } else if (result.scanMs >= scanMs.red) {
            this.logger.warn(
                `Connector ${connectorName}: pattern "${result.filePattern}" took ${result.scanMs}ms to scan ${result.scannedCount} files.`,
            );
        }
    }

    private toFtpFileMetadata(item: any, fileName: string): FileMetadataVo {
        return {
            fileName,
            modifiedDate: item.modifiedAt ? new Date(item.modifiedAt).toISOString() : null,
            size: item.size || 0,
        };
    }

    private toSftpFileMetadata(item: any, fileName: string): FileMetadataVo {
        return {
            fileName,
            // SFTP returns modifyTime as milliseconds since epoch.
            modifiedDate: item.modifyTime ? new Date(item.modifyTime).toISOString() : null,
            size: item.size || 0,
        };
    }

    /**
     * List exactly the remote directories the specs target, protocol-agnostic.
     * Each spec's `filePattern` yields a literal directory prefix and whether it
     * recurses (a `**` segment). We list each distinct prefix once — shallow, or
     * a subtree walk for a recursive prefix — dropping any prefix already
     * covered by a recursive ancestor. All returned paths are relative to the
     * connector's remotePath ('.' entries sit directly in it).
     */
    private async collectRemoteFiles(
        specs: ImportFileServerSpecificationDto[],
        listShallow: (relDir: string) => Promise<FileMetadataVo[]>,
        listRecursive: (relDir: string) => Promise<FileMetadataVo[]>,
    ): Promise<FileMetadataVo[]> {
        // prefix -> recursive (a recursive spec on a prefix wins over a shallow one)
        const wanted = new Map<string, boolean>();
        for (const spec of specs) {
            // A disabled binding contributes no directory to the scan. Filtered
            // HERE rather than only in the match phase, because this is where a
            // broken binding actually costs something: skipping only the match
            // loop would still pay to list the directory that is failing. A
            // prefix shared with an enabled binding is unaffected — that binding
            // still asks for it.
            if (spec.disabled) {
                continue;
            }

            let literalPrefix: string;
            let recursive: boolean;
            try {
                ({ literalPrefix, recursive } = parseFilePattern(spec.filePattern));
            } catch {
                // Invalid pattern — the match phase logs it per-spec; nothing to list.
                continue;
            }
            wanted.set(literalPrefix, (wanted.get(literalPrefix) ?? false) || recursive);
        }

        const isDescendantOf = (child: string, ancestor: string): boolean =>
            ancestor === '.' ? child !== '.' : child === ancestor || child.startsWith(ancestor + '/');

        const ops: { prefix: string; recursive: boolean }[] = [];
        for (const [prefix, recursive] of wanted) {
            const coveredByRecursiveAncestor = [...wanted].some(
                ([other, otherRecursive]) => otherRecursive && other !== prefix && isDescendantOf(prefix, other),
            );
            if (!coveredByRecursiveAncestor) {
                ops.push({ prefix, recursive });
            }
        }

        const files: FileMetadataVo[] = [];
        const seen = new Set<string>();
        for (const op of ops) {
            let batch: FileMetadataVo[];
            try {
                batch = op.recursive ? await listRecursive(op.prefix) : await listShallow(op.prefix);
            } catch (error) {
                this.logger.warn(`Failed to list ${op.prefix === '.' ? '(root)' : op.prefix}: ${error instanceof Error ? error.message : String(error)}`);
                continue;
            }
            for (const f of batch) {
                if (!seen.has(f.fileName)) {
                    seen.add(f.fileName);
                    files.push(f);
                }
            }
        }
        return files;
    }

    /**
     * Recursively list all files in an FTP directory and its subdirectories.
     * Appends to a single accumulator (never spreads a large array as call
     * arguments) and returns a flat list with paths relative to the base.
     */
    private async listFtpFilesRecursively(
        client: FtpClient,
        relativePath: string,
        acc: any[] = [],
        depth = 0,
    ): Promise<any[]> {
        if (depth > MAX_LISTING_DEPTH) {
            this.logger.warn(`Max listing depth (${MAX_LISTING_DEPTH}) reached at ${relativePath}; not descending further`);
            return acc;
        }

        let items: any[];
        try {
            items = await client.list(relativePath);
        } catch (error) {
            this.logger.warn(`Failed to list directory ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
            return acc;
        }

        for (const item of items) {
            const itemPath = relativePath === '.' ? item.name : path.posix.join(relativePath, item.name);
            if (item.isDirectory) {
                await this.listFtpFilesRecursively(client, itemPath, acc, depth + 1);
            } else if (item.isFile) {
                acc.push({ ...item, name: itemPath }); // Override name with full relative path
            }
        }

        return acc;
    }

    /**
     * Recursively list all files in an SFTP directory and its subdirectories.
     * Same accumulator discipline as the FTP variant.
     */
    private async listSftpFilesRecursively(
        client: any,
        basePath: string,
        relativePath: string = '',
        acc: any[] = [],
        depth = 0,
    ): Promise<any[]> {
        if (depth > MAX_LISTING_DEPTH) {
            this.logger.warn(`Max listing depth (${MAX_LISTING_DEPTH}) reached at ${basePath}/${relativePath}; not descending further`);
            return acc;
        }

        const currentPath = relativePath ? path.posix.join(basePath, relativePath) : basePath;

        let items: any[];
        try {
            items = await client.list(currentPath);
        } catch (error) {
            this.logger.warn(`Failed to list directory ${currentPath}: ${error instanceof Error ? error.message : String(error)}`);
            return acc;
        }

        for (const item of items) {
            if (item.name === '.' || item.name === '..') {
                continue;
            }
            const itemRelativePath = relativePath ? path.posix.join(relativePath, item.name) : item.name;
            if (item.type === 'd') {
                await this.listSftpFilesRecursively(client, basePath, itemRelativePath, acc, depth + 1);
            } else if (item.type === '-') {
                acc.push({ ...item, name: itemRelativePath }); // Override name with relative path from base
            }
        }

        return acc;
    }
}

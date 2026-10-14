import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { ACTIVE_RUN_STATUSES, ConnectorRunEntity, ConnectorRunStatusEnum, ConnectorRunTriggerEnum } from '../entities/connector-run.entity';
import { ViewConnectorRunDto } from '../dtos/view-connector-run.dto';
import { ConnectorRunFileService } from './connector-run-file.service';
import { ConnectorRunFileEntity } from '../entities/connector-run-file.entity';
import { ConnectorRunSpecEntity } from '../entities/connector-run-spec.entity';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ZipUtils } from 'src/shared/utils/zip.utils';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505';

export interface UpdateConnectorRunDto {
    startedAt?: Date;
    endedAt?: Date;
    discoveredAt?: Date;
    /** Time spent listing the server — see ConnectorRunEntity.listingMs. */
    listingMs?: number;
}

export interface ConnectorRunFilters {
    connectorId?: number;
    startDate?: Date;
    endDate?: Date;
    hasErrors?: boolean;
    status?: ConnectorRunStatusEnum;
    /** True: only runs that established what was on the server. */
    discoveredOnly?: boolean;
}

/**
 * The connector run table — both the work queue and the record of the work.
 *
 * A run is created `queued`, picked up by the dispatcher, and lives out its life
 * on the same row: what it found, what it ingested, how long it took, and why it
 * stopped if it did. Merging the old `job_queues` into it collapsed retry and
 * resume into one thing (an interrupted run *is* the queue entry) and put the
 * "could not reach the server" error on the same row a sysadmin is already
 * looking at.
 */
@Injectable()
export class ConnectorRunService {
    private readonly logger: Logger = new Logger(ConnectorRunService.name);

    /** Ids per DELETE, so a large bulk delete stays under Postgres's parameter cap. */
    private static readonly DELETE_CHUNK = 1000;

    constructor(
        @InjectRepository(ConnectorRunEntity)
        private runRepo: Repository<ConnectorRunEntity>,
        private runFileService: ConnectorRunFileService,
        private fileIOService: FileIOService,
    ) { }

    // ── Queue ───────────────────────────────────────────────────────────

    /**
     * Queue a run for a connector, unless one is already active.
     *
     * Coalescing is the point, not an optimisation: a connector whose drain
     * outlasts its cron interval would otherwise stack a second copy of itself
     * every tick, and two drains of one connector would claim the same `pending`
     * rows — claiming takes no row locks, because this deployment runs a single
     * worker. The check here handles the ordinary case and the partial unique
     * index catches the race.
     */
    public async enqueue(
        connectorId: number,
        triggeredBy: ConnectorRunTriggerEnum,
        maxAttempts: number,
        userId: number,
    ): Promise<ConnectorRunEntity> {
        const existing = await this.findActive(connectorId);
        if (existing) {
            this.logger.log(`Connector ${connectorId} already has a ${existing.status} run (#${existing.id}); not queueing another`);
            return existing;
        }

        const run = this.runRepo.create({
            connectorId,
            status: ConnectorRunStatusEnum.QUEUED,
            triggeredBy,
            scheduledAt: new Date(),
            attempts: 0,
            maxAttempts,
            entryUserId: userId,
        });

        try {
            const saved = await this.runRepo.save(run);
            this.logger.log(`Queued run ${saved.id} for connector ${connectorId}`);
            return saved;
        } catch (error) {
            // Lost the race against a concurrent enqueue — take whatever won.
            if (this.isUniqueViolation(error)) {
                const winner = await this.findActive(connectorId);
                if (winner) {
                    this.logger.warn(`Concurrent enqueue for connector ${connectorId}; using existing run #${winner.id}`);
                    return winner;
                }
            }
            throw error;
        }
    }

    /** The single queued/running run for a connector, or null. */
    public async findActive(connectorId: number): Promise<ConnectorRunEntity | null> {
        return this.runRepo.findOne({
            where: { connectorId, status: In(ACTIVE_RUN_STATUSES) },
        });
    }

    /**
     * Runs due to start, oldest first. `scheduled_at` is in the future only for
     * a retry backing off, so this is normally just "everything queued".
     */
    public async findDue(limit: number = 10): Promise<ConnectorRunEntity[]> {
        return this.runRepo.find({
            where: {
                status: ConnectorRunStatusEnum.QUEUED,
                scheduledAt: LessThanOrEqual(new Date()),
            },
            take: limit,
            order: { scheduledAt: 'ASC' },
        });
    }

    /**
     * Start the run, stamping `started_at` only the FIRST time.
     *
     * COALESCE, not an unconditional set, because this is called again every
     * time a run resumes — a retry, or `requeueStaleRunning` picking it up after
     * a restart. Re-stamping made a run's duration measure from its most recent
     * resume rather than from when it actually began, and produced negative
     * durations outright: an end timestamp written during an earlier attempt sat
     * against a start timestamp from a later one. Observed on a live run as
     * start 13:15 against end 12:28, a duration of minus 47 minutes.
     *
     * So a run's duration is wall clock across every attempt, including any time
     * it spent waiting to be retried. That is the operationally useful reading —
     * "this run has been going three hours" — rather than cumulative active time,
     * which would hide a run that is stuck in a retry loop.
     */
    public async markRunning(id: number): Promise<void> {
        await this.runRepo.query(
            `UPDATE connector_runs
             SET status                    = 'running',
                 started_at = COALESCE(started_at, now())
             WHERE id = $1`,
            [id],
        );
    }

    /**
     * Finish a run, unless a sysadmin cancelled it while it was going.
     *
     * Returns false in that case so the caller can report what actually
     * happened: cancellation is observed at a batch boundary and the handler
     * then unwinds normally, so without this the very next statement would
     * overwrite `cancelled` with `finished`.
     */
    public async markFinished(id: number): Promise<boolean> {
        const run = await this.runRepo.findOneBy({ id });
        if (!run) {
            return false;
        }

        const result = await this.runRepo.update(
            { id, status: Not(ConnectorRunStatusEnum.CANCELLED) },
            {
                status: ConnectorRunStatusEnum.FINISHED,
                endedAt: new Date(),
                attempts: run.attempts + 1,
            },
        );
        return (result.affected ?? 0) > 0;
    }

    /** Same cancellation guard as markFinished: a cancelled run did not fail. */
    public async markFailed(id: number, errorMessage: string): Promise<void> {
        const run = await this.runRepo.findOneBy({ id });
        if (!run) {
            return;
        }

        await this.runRepo.update(
            { id, status: Not(ConnectorRunStatusEnum.CANCELLED) },
            {
                status: ConnectorRunStatusEnum.FAILED,
                endedAt: new Date(),
                attempts: run.attempts + 1,
                errorMessage,
            },
        );
    }

    /**
     * Put a failed run back in the queue if it has attempts left.
     *
     * The same row is reused rather than a new one created, which is what makes
     * retry and resume the same act: whatever the run already discovered and
     * ingested stays attached to it, so a retry picks up where it stopped
     * instead of re-listing.
     */
    public async retry(id: number): Promise<boolean> {
        const run = await this.runRepo.findOneBy({ id });
        if (!run) {
            return false;
        }

        if (run.status === ConnectorRunStatusEnum.CANCELLED) {
            // Cancelling is a decision, not a failure. Re-queuing would put back
            // exactly the work a sysadmin just stopped.
            this.logger.log(`Run ${id} was cancelled; not retrying`);
            return false;
        }

        if (run.attempts >= run.maxAttempts) {
            this.logger.warn(`Run ${id} has exhausted its ${run.maxAttempts} attempt(s)`);
            return false;
        }

        await this.runRepo.update(id, {
            status: ConnectorRunStatusEnum.QUEUED,
            scheduledAt: new Date(Date.now() + 60000), // back off a minute
            endedAt: null,
        });
        this.logger.log(`Run ${id} re-queued (attempt ${run.attempts + 1} of ${run.maxAttempts})`);
        return true;
    }

    public async cancel(id: number): Promise<void> {
        await this.runRepo.update(id, {
            status: ConnectorRunStatusEnum.CANCELLED,
            endedAt: new Date(),
        });
        this.logger.log(`Run ${id} cancelled`);
    }

    /**
     * Whether a run has been cancelled since it started. Polled by the drain at
     * its own safe points, because cancelling only writes the status — nothing
     * interrupts a handler already running.
     *
     * Cancelling stops this run, not the work: unclaimed rows stay `pending`, so
     * the next run resumes them. Stopping the connector altogether is its
     * `disabled` flag; abandoning the backlog is deleting the run.
     */
    public async isCancelled(id: number): Promise<boolean> {
        return (await this.runRepo.countBy({ id, status: ConnectorRunStatusEnum.CANCELLED })) > 0;
    }

    /**
     * Recover runs a prior shutdown left `running`. This deployment runs a
     * single in-process worker, so at startup nothing can actually be running —
     * any such row is an orphan. Re-queue it without consuming an attempt: the
     * process dying is not the run's fault, and a run interrupted repeatedly by
     * restarts would otherwise exhaust its attempts and stop resuming.
     *
     * This is also what keeps the dispatcher alive. A stale `running` row blocks
     * every other connector through `isAnyRunning`, so this sweep is load-bearing
     * for liveness, not just for the interrupted connector.
     */
    public async requeueStaleRunning(): Promise<number> {
        const result = await this.runRepo.update(
            { status: ConnectorRunStatusEnum.RUNNING },
            { status: ConnectorRunStatusEnum.QUEUED, scheduledAt: new Date() },
        );
        const requeued = result.affected ?? 0;
        if (requeued > 0) {
            this.logger.warn(`Recovered ${requeued} stale running connector run(s) from a prior shutdown; re-queued without consuming an attempt`);
        }
        return requeued;
    }

    private isUniqueViolation(error: unknown): boolean {
        const code = (error as { code?: string; driverError?: { code?: string } })?.code
            ?? (error as { driverError?: { code?: string } })?.driverError?.code;
        return code === PG_UNIQUE_VIOLATION;
    }

    // ── Progress ────────────────────────────────────────────────────────

    /**
     * Apply the fields a caller actually set, leaving the rest untouched.
     *
     * Assigned from the DTO wholesale rather than field by field, deliberately:
     * the per-field version silently dropped any newly added field until
     * somebody remembered to add a line for it — which is exactly what happened
     * to `listing_ms`, written by discovery and never stored. `Object.assign`
     * over the DTO's own keys cannot forget, and `UpdateConnectorRunDto` is the
     * whitelist, so nothing a caller does not name can be touched.
     *
     * `undefined` values are skipped so that passing one field does not blank
     * the others.
     */
    public async update(id: number, dto: UpdateConnectorRunDto): Promise<ConnectorRunEntity> {
        const run = await this.findOne(id);

        for (const [key, value] of Object.entries(dto) as [keyof UpdateConnectorRunDto, unknown][]) {
            if (value !== undefined) {
                (run as unknown as Record<string, unknown>)[key] = value;
            }
        }

        return this.runRepo.save(run);
    }

    /**
     * Throw away everything a run recorded about the server, both tiers, so its
     * discovery can be redone from scratch. Returns what was removed.
     *
     * ONE method rather than the two it replaced, and the reason is the reason
     * there is no foreign key between the tiers. A file row is meaningless
     * without its spec row, and the old pair — `discardRunFiles` then
     * `discardRunSpecs` — left that invariant resting on a caller remembering
     * both calls, in that order. A composite FK with ON DELETE CASCADE would
     * have had the database enforce it, and was measured at +71% on inserting a
     * run's 280k file rows (3.92s -> 6.72s) to protect the one delete path that
     * needs it; the retention sweep, which is the delete that actually happens
     * in production, already cascades both tiers from `connector_run_id`. So the
     * invariant lives here instead, where it costs nothing: a caller cannot hold
     * one half of it.
     *
     * Both deletes in one transaction, so a failure between them cannot leave
     * file rows whose spec rows are gone.
     *
     * Order still matters WITHIN the transaction only for legibility — there is
     * no constraint between them — so files go first, child-before-parent, the
     * way the cascade would have done it.
     */
    public async discardSnapshot(runId: number): Promise<{ files: number; specs: number }> {
        return this.runRepo.manager.transaction(async (manager) => {
            const files = await manager.delete(ConnectorRunFileEntity, { connectorRunId: runId });
            const specs = await manager.delete(ConnectorRunSpecEntity, { connectorRunId: runId });
            return { files: files.affected ?? 0, specs: specs.affected ?? 0 };
        });
    }

    // ── Downloads ───────────────────────────────────────────────────────

    /**
     * Zip up the file a failed import retained, for the run-file download.
     *
     * The row is looked up by its own key and the operation directory read off
     * it, rather than taking an operation id from the caller, so an operation id
     * in a URL cannot be used to read directories no connector ever retained. A
     * row with no retained directory 404s: either it succeeded, it was an
     * export, or the run had already spent its retention budget.
     */
    public async buildRunFileDownload(
        runId: number,
        bindingId: number,
        remotePath: string,
    ): Promise<{ buffer: Buffer; filename: string }> {
        const operationId = await this.runFileService.findRetainedOperationId(runId, bindingId, remotePath);
        if (!operationId) {
            throw new NotFoundException(`No retained file to download for "${remotePath}" in run #${runId}.`);
        }

        const op = this.fileIOService.getOperationContext(operationId as crypto.UUID);

        // The input directory holds the file exactly as it came off the remote
        // server. The intermediate and output directories hold whatever the
        // adapter and the transform managed to produce before failing, which is
        // usually what explains the failure, so the whole operation is zipped
        // rather than just the download.
        try {
            await fs.promises.access(op.apiDir);
        } catch {
            throw new NotFoundException(`The retained files for "${remotePath}" are no longer on disk.`);
        }

        // Named after the remote file rather than a row id, since there is no
        // row id any more and the file name is what the sysadmin is looking for.
        const safeName = path.posix.basename(remotePath).replace(/[^A-Za-z0-9._-]/g, '_') || 'run-file';
        return {
            buffer: ZipUtils.buildZipBufferFromDir(op.apiDir),
            filename: `${safeName}-run-${runId}.zip`,
        };
    }

    // ── Deletion and retention ──────────────────────────────────────────

    /**
     * Delete one run. `connector_run_specs` and `connector_run_files` cascade
     * with it; the retained operation directories of that run's failed files are
     * removed from disk first, so the orphan sweep in CleanupSchedulerService is
     * only ever a backstop for an interrupted delete.
     */
    public async delete(id: number): Promise<void> {
        await this.findOne(id); // 404s if it doesn't exist

        const operationIds = await this.runFileService.findOperationIdsByRun(id);
        await this.deleteOperationDirs(operationIds);

        await this.runRepo.delete({ id });
        this.logger.log(`Deleted run ${id} (and ${operationIds.length} retained operation dir(s))`);
    }

    /**
     * Delete every run matching a filter — the sysadmin's "clean up after
     * clearing the file server" action, and the bulk counterpart of `delete`.
     *
     * It reuses `buildWhere`, the same clause the list and the count use, so the
     * set deleted is exactly the set the list is showing. That is the whole
     * point of driving it from a filter rather than from a connector id: a set
     * the user can page through and count first is a set they can check before
     * destroying it.
     *
     * Queued and running runs are excluded, and reported back rather than
     * silently skipped. Deleting a run the dispatcher is holding would free its
     * slot in `uq_connector_runs_active` while its drain is still going, letting
     * the scheduler start a second run of the same connector — two drains
     * claiming the same pending rows, which is the exact invariant that index
     * exists to prevent. A run has to be cancelled before it can be deleted.
     *
     * Cascades to `connector_run_specs` and `connector_run_files`, which for an
     * import connector includes the de-duplication rows. Whether that matters
     * depends on whether a connector's newest snapshot is in the deleted set;
     * the caller is responsible for warning about it.
     */
    public async deleteByFilters(filters?: ConnectorRunFilters): Promise<{ deleted: number; skippedActive: number }> {
        const { sql: where, params } = this.buildWhere(filters);

        // The lateral comes along because `hasErrors` filters on its output.
        const rows = await this.runRepo.query(
            `SELECT r.id, (r.status IN ('queued', 'running')) AS active`
            + `${ConnectorRunService.RUN_FROM}${where}`,
            params,
        );

        const matched = rows as { id: string; active: boolean }[];
        const ids: number[] = matched.filter(r => !r.active).map(r => Number(r.id));
        const skippedActive: number = matched.length - ids.length;

        if (ids.length === 0) {
            if (skippedActive > 0) {
                this.logger.log(`Bulk delete matched ${skippedActive} run(s), all still queued or running; nothing deleted`);
            }
            return { deleted: 0, skippedActive };
        }

        const operationIds = await this.runFileService.findOperationIdsByRuns(ids);
        await this.deleteOperationDirs(operationIds);

        // Chunked, and delete() rather than remove(): the id list is bounded by
        // how many runs the filter matched, which for a connector that has been
        // running on a short cron for a year is thousands.
        let deleted = 0;
        for (let i = 0; i < ids.length; i += ConnectorRunService.DELETE_CHUNK) {
            const result = await this.runRepo.delete(ids.slice(i, i + ConnectorRunService.DELETE_CHUNK));
            deleted += result.affected ?? 0;
        }

        this.logger.log(
            `Deleted ${deleted} connector run(s) matching the requested filter`
            + ` (and ${operationIds.length} retained operation dir(s))`
            + (skippedActive > 0 ? `; left ${skippedActive} queued/running run(s) alone` : ''),
        );
        return { deleted, skippedActive };
    }

    /**
     * Discard a run whose discovery never completed, along with whatever partial
     * snapshot it recorded.
     *
     * Resuming such a run would drain a subset of the server, mark those files
     * `success`, and then never be usable as a baseline — so the next run would
     * re-import them anyway. Listing takes seconds; redoing it is cheaper than
     * draining work that has to be redone. Discarding also keeps `discovered_at
     * IS NULL` meaning exactly one thing: this run never established what was on
     * the server.
     */
    public async discardIncomplete(id: number): Promise<void> {
        const operationIds = await this.runFileService.findOperationIdsByRun(id);
        await this.deleteOperationDirs(operationIds);
        await this.runRepo.delete({ id });
        this.logger.warn(`Discarded run ${id}: its discovery never completed, so it holds no usable snapshot`);
    }

    /**
     * Retention sweep. Two rules on one table, because the table now holds two
     * kinds of row:
     *
     *  - runs that hold a snapshot: keep the newest `keepLast` per connector
     *  - runs that never reached the server: delete once older than `attemptDays`
     *
     * Counting only snapshot-bearing runs for `keepLast` is load-bearing. A
     * connector unreachable overnight can accumulate hundreds of failed
     * attempts, and if those counted, they would push the last real snapshot out
     * of the retention window — taking the de-duplication baseline with it, so
     * the connector would re-ingest its entire file server.
     *
     * Partitioning by connector matters for the same reason: a globally sorted
     * "oldest first" delete would eventually take the only remaining snapshot of
     * a connector that is disabled, runs weekly, or was unreachable for a while.
     * Ranking within each connector and clamping `keepLast` to at least one makes
     * a connector's newest snapshot unreachable by this query.
     *
     * Ordering is by id rather than start time: monotonic, never null, no ties.
     *
     * Selecting before deleting, rather than one DELETE, so the operation
     * directories those runs retained can be removed from disk first.
     */
    public async pruneToLatest(keepLast: number, attemptDays: number = 7): Promise<number> {
        const keep = Math.max(1, Math.floor(keepLast));
        const days = Math.max(1, Math.floor(attemptDays));

        const rows = await this.runRepo.query(
            `SELECT id FROM (
                 SELECT id, row_number() OVER (PARTITION BY connector_id ORDER BY id DESC) AS rn
                 FROM connector_runs
                 WHERE discovered_at IS NOT NULL
             ) ranked
             WHERE rn > $1
             UNION
             SELECT id FROM connector_runs
             WHERE discovered_at IS NULL
               AND status NOT IN ('queued', 'running')
               AND entry_date_time < now() - ($2 || ' days')::interval`,
            [keep, days],
        );

        const ids: number[] = (rows as { id: string }[]).map(r => Number(r.id));
        if (ids.length === 0) {
            return 0;
        }

        for (const id of ids) {
            const operationIds = await this.runFileService.findOperationIdsByRun(id);
            await this.deleteOperationDirs(operationIds);
        }

        const result = await this.runRepo.delete(ids);
        const deleted = result.affected ?? 0;
        this.logger.log(`Retention sweep deleted ${deleted} connector run(s): kept the newest ${keep} snapshot(s) per connector, dropped failed attempts older than ${days} day(s)`);
        return deleted;
    }

    /** Best-effort disk cleanup — a failure here must not abort the DB delete. */
    private async deleteOperationDirs(operationIds: string[]): Promise<void> {
        for (const operationId of operationIds) {
            try {
                await this.fileIOService.deleteOperation(operationId);
            } catch (error) {
                this.logger.warn(`Could not delete operation dir ${operationId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    // ── Queries ─────────────────────────────────────────────────────────

    /**
     * The FROM clause every run query shares: a run row joined to the sum of its
     * own spec rows.
     *
     * A LATERAL join rather than a GROUP BY over the whole table, so the
     * aggregate is evaluated once per run that survives the WHERE — a paged list
     * sums 25 runs' spec rows, not every run the connector has ever had.
     *
     * Summed from the spec tier and deliberately not from the file tier. Both
     * were measured against a connector holding 280,513 files per run:
     *
     *     from connector_run_specs   0.2 ms per 25-run page
     *     from connector_run_files   ~2,800 ms per 25-run page
     *
     * A run has one spec row per specification — single digits — while the file
     * tier would re-aggregate a quarter of a million rows per run on every page
     * load. The spec rows are kept true by ConnectorRunSpecService: incremented
     * per ingestion batch, then reconciled from the file rows once at the end of
     * a drain.
     *
     * The subquery aggregates, so it always returns exactly one row even for a
     * run with no spec rows at all — a run that never reached the server sums to
     * zeros, which is the truth about it, and has no files either.
     *
     * sum() over int returns bigint, so each is clamped and cast back to int4 —
     * the same clamp the dropped columns carried, and for the same reason.
     */
    private static readonly RUN_FROM = `
        FROM connector_runs r
        LEFT JOIN LATERAL (
            SELECT LEAST(2147483647, coalesce(sum(s.scanned_count), 0))::int   AS scanned_count,
                   LEAST(2147483647, coalesce(sum(s.matched_count), 0))::int   AS total_files,
                   LEAST(2147483647, coalesce(sum(s.succeeded_count), 0))::int AS success_count,
                   LEAST(2147483647, coalesce(sum(s.skipped_count), 0))::int   AS skipped_count,
                   LEAST(2147483647, coalesce(sum(s.failed_count), 0))::int    AS failed_count,
                   LEAST(2147483647, coalesce(sum(s.empty_count), 0))::int     AS empty_count,
                   LEAST(2147483647, coalesce(sum(s.excluded_count), 0))::int  AS excluded_count,
                   -- bigint, unclamped: see connector_run_specs.observation_rows.
                   coalesce(sum(s.observation_rows), 0)::bigint                   AS observation_rows,
                   LEAST(2147483647, coalesce(sum(s.scan_ms), 0))::int         AS total_scan_ms,
                   LEAST(2147483647, coalesce(sum(s.process_ms), 0))::int      AS total_process_ms,
                   LEAST(2147483647, coalesce(sum(s.transfer_ms), 0))::int     AS total_transfer_ms
            FROM connector_run_specs s
            WHERE s.connector_run_id = r.id
        ) agg ON true`;

    /**
     * The projected columns. `duration_ms` is computed here rather than stored:
     * while a run is still active it is measured against now(), so it advances
     * on its own — which is what the per-batch UPDATE on connector_runs used to
     * be for.
     *
     * It keys on `status` rather than on "is ended_at null". The two agree now
     * that only a terminal state stamps an end — discovery used to stamp one
     * when it completed and then drain for hours afterwards, which froze a
     * draining run's duration at the end of its discovery, and produced
     * negative durations once markRunning re-stamped the start underneath it.
     * Keying on status stays the safer of the two regardless: it cannot be
     * misled by a stamp written early.
     *
     * A run's duration is therefore wall clock from its FIRST attempt to its
     * terminal state, retry waits included — `markRunning` stamps `started_at`
     * with a COALESCE so a resume never moves it. That is the operationally
     * useful reading ("this run has been going three hours") rather than
     * cumulative active time, which would hide a run stuck in a retry loop.
     */
    private static readonly RUN_SELECT = `
        SELECT r.id, r.connector_id, r.status, r.triggered_by, r.scheduled_at,
               r.attempts, r.max_attempts, r.error_message, r.discovered_at, r.listing_ms,
               r.started_at, r.ended_at,
               r.entry_user_id, r.entry_date_time,
               agg.scanned_count, agg.total_files, agg.success_count, agg.skipped_count,
               agg.failed_count, agg.empty_count, agg.excluded_count, agg.observation_rows, agg.total_scan_ms, agg.total_process_ms,
               agg.total_transfer_ms,
               CASE
                   WHEN r.started_at IS NULL THEN 0
                   ELSE GREATEST(0, LEAST(2147483647, FLOOR(EXTRACT(EPOCH FROM (
                            CASE
                                WHEN r.status IN ('queued', 'running')
                                  OR r.ended_at IS NULL
                                THEN now()
                                ELSE r.ended_at
                            END - r.started_at)) * 1000)))
               END::int AS duration_ms`;

    /**
     * Build the shared WHERE clause. `hasErrors` reads the lateral's output
     * directly — a join's columns are available to WHERE, so this needs no
     * second pass and no HAVING.
     */
    private buildWhere(filters?: ConnectorRunFilters): { sql: string; params: unknown[] } {
        const clauses: string[] = [];
        const params: unknown[] = [];
        const bind = (value: unknown): string => {
            params.push(value);
            return `$${params.length}`;
        };

        if (filters?.connectorId) {
            clauses.push(`r.connector_id = ${bind(filters.connectorId)}`);
        }

        if (filters?.status) {
            clauses.push(`r.status = ${bind(filters.status)}`);
        }

        if (filters?.discoveredOnly) {
            clauses.push(`r.discovered_at IS NOT NULL`);
        }

        // Filtered on entry time rather than start time: a queued run has no
        // start time yet, and would otherwise vanish from a date-filtered list.
        if (filters?.startDate) {
            clauses.push(`r.entry_date_time >= ${bind(filters.startDate)}`);
        }
        if (filters?.endDate) {
            clauses.push(`r.entry_date_time <= ${bind(filters.endDate)}`);
        }

        if (filters?.hasErrors !== undefined) {
            clauses.push(filters.hasErrors ? `agg.failed_count > 0` : `agg.failed_count = 0`);
        }

        return {
            sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
            params,
        };
    }

    /**
     * Raw row to DTO. `id` is bigint, which pg returns as a string; the counts
     * are cast to int4 in SQL and so arrive as numbers already.
     */
    private mapRun(row: Record<string, any>): ViewConnectorRunDto {
        return {
            id: Number(row.id),
            connectorId: row.connector_id,
            status: row.status,
            triggeredBy: row.triggered_by,
            scheduledAt: row.scheduled_at,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
            errorMessage: row.error_message,
            discoveredAt: row.discovered_at,
            listingMs: row.listing_ms,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            scannedCount: row.scanned_count,
            totalFiles: row.total_files,
            successCount: row.success_count,
            skippedCount: row.skipped_count,
            failedCount: row.failed_count,
            emptyCount: row.empty_count,
            excludedCount: row.excluded_count,
            // bigint arrives as a string.
            observationRows: Number(row.observation_rows),
            totalScanMs: row.total_scan_ms,
            totalProcessMs: row.total_process_ms,
            totalTransferMs: row.total_transfer_ms,
            durationMs: row.duration_ms,
            entryUserId: row.entry_user_id,
            entryDateTime: row.entry_date_time,
        };
    }

    /**
     * The stored row only — for the lifecycle transitions, which write columns
     * and never need the aggregates. `findOneView` is what serves a reader.
     */
    public async findOne(id: number): Promise<ConnectorRunEntity> {
        const run = await this.runRepo.findOneBy({ id: id });

        if (!run) {
            throw new NotFoundException(`Connector run #${id} not found`);
        }

        return run;
    }

    /** One run with its aggregates — the shape the API returns. */
    public async findOneView(id: number): Promise<ViewConnectorRunDto> {
        const rows = await this.runRepo.query(
            `${ConnectorRunService.RUN_SELECT}${ConnectorRunService.RUN_FROM} WHERE r.id = $1`,
            [id],
        );

        const row = (rows as Record<string, any>[])[0];
        if (!row) {
            throw new NotFoundException(`Connector run #${id} not found`);
        }

        return this.mapRun(row);
    }

    /**
     * Paged, newest first. Paging is done in SQL: the list used to load every
     * run a connector had ever had and slice it in the controller, which is
     * exactly the shape that stops scaling once a connector has run for a year.
     */
    public async findAll(
        filters?: ConnectorRunFilters,
        paging?: { page?: number; pageSize?: number },
    ): Promise<ViewConnectorRunDto[]> {
        const { sql: where, params } = this.buildWhere(filters);

        let limits = '';
        if (paging?.pageSize && paging.pageSize > 0) {
            const page = paging.page && paging.page > 0 ? paging.page : 1;
            params.push(paging.pageSize, (page - 1) * paging.pageSize);
            limits = ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
        }

        const rows = await this.runRepo.query(
            `${ConnectorRunService.RUN_SELECT}${ConnectorRunService.RUN_FROM}${where}`
            + ` ORDER BY r.entry_date_time DESC${limits}`,
            params,
        );

        return (rows as Record<string, any>[]).map(row => this.mapRun(row));
    }

    /**
     * The run an import's change detection compares against: the newest one that
     * actually established what was on the server.
     *
     * The `discovered_at` filter is not a nicety. Runs exist from the moment
     * they are queued, so a connector that could not connect leaves rows with no
     * file records at all. Join against one of those and every file on the server
     * looks new — a full re-import of everything. Skipping them means the last
     * known state stays authoritative for as long as the server is unreachable,
     * which is the correct answer: a week of failed connections tells you nothing
     * new about what is on disk.
     */
    public async findLatestDiscoveredByConnector(connectorId: number): Promise<ConnectorRunEntity | null> {
        return this.runRepo.findOne({
            where: { connectorId, discoveredAt: Not(IsNull()) },
            order: { id: 'DESC' },
        });
    }

    /**
     * Headline numbers for a connector.
     *
     * `totalRuns` counts every attempt, including those that never reached the
     * server — that is the point of `failedRuns`, which is how a sysadmin sees
     * "this connector has not connected since Tuesday". `filesFailed` is a
     * different question entirely: files that failed inside runs that were
     * otherwise fine.
     *
     * One aggregate query rather than loading every run into memory to reduce
     * it, which is what this did before.
     */
    public async getConnectorStats(connectorId: number, startDate?: Date, endDate?: Date): Promise<{
        totalRuns: number;
        filesFailed: number;
        successfulRuns: number;
        failedRuns: number;
        lastRun: Date | null;
    }> {
        const { sql: where, params } = this.buildWhere({ connectorId, startDate, endDate });

        const rows = await this.runRepo.query(
            `SELECT count(*)::int                                                            AS total_runs,
                    LEAST(2147483647, coalesce(sum(agg.failed_count), 0))::int               AS files_failed,
                    count(*) FILTER (WHERE r.status = 'finished'
                                       AND agg.failed_count = 0)::int                        AS successful_runs,
                    count(*) FILTER (WHERE r.status = 'failed'
                                        OR agg.failed_count > 0)::int                        AS failed_runs,
                    max(r.entry_date_time)                                                   AS last_run`
            + `${ConnectorRunService.RUN_FROM}${where}`,
            params,
        );

        const row = (rows as Record<string, any>[])[0];
        return {
            totalRuns: row?.total_runs ?? 0,
            filesFailed: row?.files_failed ?? 0,
            successfulRuns: row?.successful_runs ?? 0,
            failedRuns: row?.failed_runs ?? 0,
            lastRun: row?.last_run ?? null,
        };
    }

    /** Counts the same set `findAll` would return, `hasErrors` included. */
    public async count(filters?: ConnectorRunFilters): Promise<number> {
        const { sql: where, params } = this.buildWhere(filters);

        const rows = await this.runRepo.query(
            `SELECT count(*)::int AS total${ConnectorRunService.RUN_FROM}${where}`,
            params,
        );

        return (rows as { total: number }[])[0]?.total ?? 0;
    }
}

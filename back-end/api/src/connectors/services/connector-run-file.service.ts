import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, In, LessThanOrEqual, MoreThanOrEqual, Not, IsNull, Repository } from 'typeorm';
import { ConnectorRunFileEntity, RunFileStatusEnum } from '../entities/connector-run-file.entity';

/**
 * One run-file row as a caller supplies it — see ConnectorRunFileEntity for what
 * each column means and why.
 *
 * Written out rather than derived from the entity with `Omit`, unlike
 * `RunSpecInsert`. The difference is what would have to be omitted: there, one
 * relation, mechanically; here, two relations AND two columns that are
 * deliberately not a caller's to give. An exclusion list cannot say WHY a column
 * is missing, and those two reasons are worth a sentence each:
 *
 *  - `lastProcessedAt` is stamped by `recordBatch` itself, so every row of one
 *    batch carries the same instant and no caller can back-date a row.
 *  - `observationRows` is recorded per file by an IMPORT only. An export's
 *    observation count belongs to its specification, not to any one generated
 *    file, because one COPY can produce several — see
 *    ConnectorRunSpecEntity.observationRows. These rows leave it null.
 *
 * The relations are absent for the ordinary reason: they are these FK columns in
 * object form, and a caller sets `connectorRunId` and `connectorId` instead.
 *
 * Every field below is required, including the nullable ones. Both callers
 * already pass all of them, and stating a null explicitly is what stops
 * `recordBatch` having to guess on a caller's behalf.
 */
export interface RunFileUpsert {
    /** Always set — every run file is written inside a run. */
    connectorRunId: number;
    /** `connector_specification_bindings.id` — the row's identity within the run. */
    bindingId: number;
    remotePath: string;
    specificationId: number;
    connectorId: number;
    stationId: string | null;
    fileMtime: Date | null;
    fileSize: number | null;
    lastStatus: RunFileStatusEnum;
    lastError: string | null;
    /** Retained operation directory for a failed import; null otherwise. */
    operationId: string | null;
    /** Null when local work never ran, e.g. the download failed. */
    lastProcessMs: number | null;
    /** Null when nothing was transferred: a skipped file, or a failed generation. */
    lastTransferMs: number | null;
}

export interface RunFilesQuery {
    status?: RunFileStatusEnum;
    /**
     * Free text matched against the whole remote path, case-insensitively.
     * `*` is a wildcard; text without one matches anywhere in the path, which
     * is what a sysadmin typing a station name expects.
     */
    search?: string;
    /** Inclusive bounds on the file's modified time, as the server listed it. */
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    pageSize?: number;
}

/** One listed remote file, as handed to the discovery upsert. */
export interface DiscoveredFile {
    remotePath: string;
    fileMtime: Date | null;
    fileSize: number | null;
}

/**
  * A claimed unit of work — everything the ingestion phase needs for one file.
  * There is no id: a run file is identified by its run plus its binding and
  * remote path, which is also its primary key.
  */
export interface ClaimedRunFile {
    /**
     * The binding this file was discovered under. Identifies the row together
     * with its run and remote path, and is the bucket its outcome is tallied
     * into.
     */
    bindingId: number;
    specificationId: number;
    stationId: string | null;
    remotePath: string;
    /**
     * Size the SERVER reported for this file when it was listed — not the size
     * of whatever ends up on disk. The drain compares the two: a file the
     * listing called 0 bytes that downloads as 0 bytes is genuinely empty,
     * while one the listing called 500 bytes that downloads as 0 bytes is a
     * truncated transfer wearing the same disguise.
     *
     * Null when the server reported no size at all.
     */
    fileSize: number | null;
}

/** The outcome of acting on one claimed file. */
export interface RunFileSettlement {
    status: RunFileStatusEnum.SUCCESS | RunFileStatusEnum.FAILED | RunFileStatusEnum.EMPTY;
    errorMessage?: string | null;
    /** Retained operation directory for a failed file; null otherwise. */
    operationId?: string | null;
    /** Null when processing never ran, e.g. the download failed. */
    processMs?: number | null;
    /** Transfer time, recorded for failed downloads as well as successful ones. */
    transferMs?: number | null;
    /** Observations written to Postgres. Success only. */
    observationRows?: number | null;
}

/**
 * The connector run-file ledger — see ConnectorRunFileEntity.
 *
 * Import uses it as a work queue: `markDiscovered` records a listing and marks
 * what needs doing, `claimPending` takes the next page, `settle` records one
 * outcome. Nothing about the pending set is held in memory between those calls.
 *
 * Export has no queue and no de-duplication, but it does record every file it
 * generated, success or failure, in one batched upsert per run via
 * `recordBatch`. Those rows are a pure audit trail — nothing is ever compared
 * against them — and they are what the run and spec tiers are summed from.
 */
@Injectable()
export class ConnectorRunFileService {
    private readonly logger = new Logger(ConnectorRunFileService.name);

    /**
     * Postgres caps bind parameters at 65535; keep chunks well under that.
     * Only `recordBatch` (export) needs this. The import statements pass their
     * listing through `unnest` and so bind a fixed count regardless of chunk
     * size — nine for `markDiscovered`, eight for `markExcluded` — which is why
     * DISCOVERY_CHUNK can be far larger than this.
     */
    private static readonly UPSERT_CHUNK = 500;

    constructor(
        @InjectRepository(ConnectorRunFileEntity)
        private readonly repo: Repository<ConnectorRunFileEntity>,
    ) { }

    /**
     * Import discovery: record one chunk of a remote listing into this run, and
     * report how many of those files need ingesting.
     *
     * Every matched file gets a row, which is what makes a run's record a
     * complete snapshot of the file server rather than only a list of what it
     * touched. The status is decided by joining against the PREVIOUS run's rows,
     * so all of what `hasFileChanged` used to do in memory happens here:
     *
     *   - not in the previous run under
     *     the SAME BINDING                -> `pending` (new file)
     *   - size or mtime differs          -> `pending` (changed)
     *   - bound to a different station   -> `pending` (re-read under the new one)
     *   - unchanged, was `success`       -> `skipped` (seen before, unchanged)
     *   - unchanged, was `empty`         -> `empty` (still empty; re-downloading
     *                                       it can only find the same nothing)
     *   - unchanged, anything else       -> `pending` (retry a failure, or pick
     *                                       up work an interrupted run left)
     *
     * `prevRunId` is null on a connector's first ever run. The join then matches
     * nothing and every file is correctly `pending`.
     *
     * The listing arrives as three parallel arrays fed through `unnest`, so the
     * statement binds a fixed nine parameters no matter how many files are in
     * the chunk. That sidesteps Postgres's 65535-parameter cap entirely, which
     * is why the discovery chunk can be far larger than UPSERT_CHUNK.
     *
     * All three counts come back from the one CTE: `matched` is every row
     * written, `pending` the subset needing work, and `empty` the subset carried
     * forward as still-empty. A spec's skipped count is what is left over —
     * matched minus pending minus empty — so it still needs no second query.
     * `empty` has to be returned separately rather than folded into the
     * leftover: it is not pending, so deriving skipped as matched-minus-pending
     * alone silently counted every carried-forward empty file as unchanged.
     */
    public async markDiscovered(
        connectorId: number,
        bindingId: number,
        specificationId: number,
        stationId: string | null,
        connectorRunId: number,
        prevRunId: number | null,
        files: DiscoveredFile[],
    ): Promise<{ matched: number; pending: number; empty: number }> {
        if (files.length === 0) {
            return { matched: 0, pending: 0, empty: 0 };
        }

        const remotePaths: string[] = [];
        const fileMtimes: (Date | null)[] = [];
        const fileSizes: (number | null)[] = [];
        for (const file of files) {
            remotePaths.push(file.remotePath);
            fileMtimes.push(file.fileMtime);
            fileSizes.push(file.fileSize);
        }

        const rows = await this.repo.query(
            `WITH recorded AS (
                 INSERT INTO connector_run_files
                     (connector_id, binding_id, specification_id, station_id, remote_path,
                      file_mtime, file_size, last_status,
                      connector_run_id, last_processed_at)
                 SELECT $1::int, $2::int, $3::int, $4::varchar, p.remote_path, p.file_mtime, p.file_size,
                        -- The cast is required, not decorative. A bare literal
                        -- in an INSERT ... SELECT is coerced to the target
                        -- column's type, but a CASE unifies its branches to
                        -- text first, and text has no implicit cast to an enum.
                        -- The type name is TypeORM's generated one for this
                        -- column: <table>_<column>_enum.
                        --
                        -- The "has anything changed?" tests come first, so every
                        -- status test below them describes an UNCHANGED file.
                        -- That ordering is what lets a settled status be carried
                        -- forward instead of the file being re-done every run.
                        (CASE WHEN prev.remote_path IS NULL                      THEN 'pending'
                              WHEN prev.file_size  IS DISTINCT FROM p.file_size  THEN 'pending'
                              WHEN prev.file_mtime IS DISTINCT FROM p.file_mtime THEN 'pending'
                              -- Not a property of the file, but of how the file
                              -- is to be read. Re-pointing a pattern at another
                              -- station changes what its rows mean, and the file
                              -- itself is untouched, so nothing above would
                              -- notice. Without this the new row would record the
                              -- new station while the observations table still
                              -- held the old one, with nothing to reconcile them.
                              WHEN prev.station_id IS DISTINCT FROM $4::varchar  THEN 'pending'
                              -- Unchanged from here down.
                              --
                              -- 'skipped' has the same standing as 'success': it
                              -- means "ingested successfully at some point and
                              -- unchanged since", and every has-it-changed test
                              -- above has already run.
                              --
                              -- Both are needed here because this CASE is what
                              -- writes 'skipped' in the first place. An unchanged
                              -- file settles as 'skipped', so the NEXT run sees
                              -- 'skipped' rather than 'success' as its previous
                              -- status; recognising only 'success' would send
                              -- every unchanged file back to pending on
                              -- alternate runs — the whole file server
                              -- re-imported, hundreds of thousands of files.
                              WHEN prev.last_status IN ('success', 'skipped')    THEN 'skipped'
                              -- An unchanged empty file is still empty, so it
                              -- stays counted without paying for a transfer and
                              -- a transform that can only find the same nothing.
                              --
                              -- Deliberately NOT conditional on the listing
                              -- saying zero bytes, because 'empty' has two
                              -- sources: a zero-byte file, and a file with bytes
                              -- whose content transformed to no observations (no
                              -- data rows, or every value missing). The second
                              -- kind has a real size, and requiring zero would
                              -- send it back to pending on every run, forever.
                              --
                              -- A truncated transfer cannot reach this test as
                              -- 'empty': settleIfEmpty compares the download
                              -- against the listing and settles a short one as
                              -- 'failed'.
                              WHEN prev.last_status = 'empty'                    THEN 'empty'
                              -- 'failed', 'excluded', or 'pending' from an
                              -- interrupted drain. 'excluded' lands here by
                              -- design: it is not carried forward, so dropping an
                              -- exclude glob re-queues the file with no special
                              -- handling anywhere.
                              ELSE 'pending' END)::connector_run_files_last_status_enum,
                        $5::bigint, now()
                 FROM unnest($7::text[], $8::timestamptz[], $9::bigint[])
                      AS p(remote_path, file_mtime, file_size)
                 -- Joined on the BINDING, so "the same file" means the same
                 -- file read by the same binding: two bindings of one
                 -- specification over different directories keep separate
                 -- ledgers and neither undoes the other's work.
                 LEFT JOIN connector_run_files prev
                        ON prev.connector_run_id = $6::bigint
                       AND prev.binding_id       = $2::int
                       AND prev.remote_path      = p.remote_path
                 RETURNING last_status
             )
             SELECT count(*)::int                                        AS matched,
                    count(*) FILTER (WHERE last_status = 'pending')::int AS pending,
                    count(*) FILTER (WHERE last_status = 'empty')::int   AS empty
             FROM recorded`,
            [connectorId, bindingId, specificationId, stationId, connectorRunId, prevRunId, remotePaths, fileMtimes, fileSizes],
        );

        const row = (rows as { matched: number; pending: number; empty: number }[])[0];
        return { matched: row?.matched ?? 0, pending: row?.pending ?? 0, empty: row?.empty ?? 0 };
    }

    /**
     * Record one chunk of files this run's binding excluded.
     *
     * Deliberately not part of `markDiscovered`: an excluded file needs no
     * comparison with the previous run, because exclusion is decided by the
     * binding's current globs alone. So this is a plain insert with no join and
     * no CASE, and it never produces work.
     *
     * `ON CONFLICT DO NOTHING` for the same reason the discovery upsert is
     * idempotent: a run whose discovery is re-entered after an interruption
     * re-lists the same directory, and the second pass must not fail on rows
     * the first one wrote.
     */
    public async markExcluded(
        connectorId: number,
        bindingId: number,
        specificationId: number,
        stationId: string | null,
        connectorRunId: number,
        files: DiscoveredFile[],
    ): Promise<void> {
        if (files.length === 0) {
            return;
        }

        const remotePaths: string[] = [];
        const fileMtimes: (Date | null)[] = [];
        const fileSizes: (number | null)[] = [];
        for (const file of files) {
            remotePaths.push(file.remotePath);
            fileMtimes.push(file.fileMtime);
            fileSizes.push(file.fileSize);
        }

        await this.repo.query(
            `INSERT INTO connector_run_files
                 (connector_id, binding_id, specification_id, station_id, remote_path,
                  file_mtime, file_size, last_status,
                  connector_run_id, last_processed_at)
             SELECT $1::int, $5::int, $2::int, $3::varchar, p.remote_path, p.file_mtime, p.file_size,
                    'excluded'::connector_run_files_last_status_enum,
                    $4::bigint, now()
             FROM unnest($6::text[], $7::timestamptz[], $8::bigint[])
                  AS p(remote_path, file_mtime, file_size)
             ON CONFLICT (connector_run_id, binding_id, remote_path) DO NOTHING`,
            [connectorId, specificationId, stationId, connectorRunId, bindingId, remotePaths, fileMtimes, fileSizes],
        );
    }

    /**
     * How many of a run's failures are still holding an operation directory.
     * Read once when a drain starts so the retention budget carries across a
     * resumed run rather than resetting with each job execution.
     */
    public async countRetainedFailures(runId: number): Promise<number> {
        return this.repo.count({
            where: { connectorRunId: runId, operationId: Not(IsNull()) },
        });
    }

    /**
     * The run(s) a connector's outstanding work belongs to, oldest first.
     * Normally exactly one, because discovery is skipped while a backlog exists;
     * more than one would mean an older drain was interrupted and is resumed
     * first.
     */
    public async findPendingRunIds(connectorId: number): Promise<number[]> {
        const rows = await this.repo.query(
            `SELECT DISTINCT connector_run_id AS run_id
             FROM connector_run_files
             WHERE connector_id = $1 AND last_status = 'pending'
             ORDER BY run_id ASC`,
            [connectorId],
        );
        return (rows as { run_id: string }[]).map(r => Number(r.run_id));
    }

    /**
     * Take the next page of outstanding work for one run. Oldest data first, so
     * a partially drained backlog has ingested a contiguous span of history
     * rather than a random scatter.
     *
     * No row-level locking: this deployment runs a single in-process worker, so
     * nothing else can claim these. If the API is ever run multi-instance this
     * becomes `FOR UPDATE SKIP LOCKED` plus a claimed_at column for recovering
     * rows an instance died holding.
     */
    public async claimPending(runId: number, limit: number): Promise<ClaimedRunFile[]> {
        // No secondary sort key. The claim is not a stable cursor — every row it
        // returns is settled before the next claim runs, so a re-claim can never
        // see the same row twice and ties within one mtime need no tiebreak.
        const rows = await this.repo.query(
            `SELECT binding_id, specification_id, station_id, remote_path, file_size
             FROM connector_run_files
             WHERE connector_run_id = $1
               AND last_status = 'pending'
             ORDER BY file_mtime ASC NULLS LAST
             LIMIT $2`,
            [runId, limit],
        );

        return (rows as { binding_id: number; specification_id: number; station_id: string | null; remote_path: string; file_size: string | null }[])
            .map(r => ({
                bindingId: r.binding_id,
                specificationId: r.specification_id,
                stationId: r.station_id,
                remotePath: r.remote_path,
                // bigint arrives as a string from the driver.
                fileSize: r.file_size === null ? null : Number(r.file_size),
            }));
    }

    /**
     * Record the outcome of one claimed file. Written per file rather than per
     * batch so a crash costs at most the file in flight — everything already
     * settled stays settled, and everything not yet claimed stays `pending`.
     *
     * Identity columns and `connector_run_id` are untouched: the row
     * already belongs to this run, having been placed there by discovery.
     */
    public async settle(runId: number, file: ClaimedRunFile, settlement: RunFileSettlement): Promise<void> {
        await this.repo.update(
            {
                connectorRunId: runId,
                bindingId: file.bindingId,
                remotePath: file.remotePath,
            },
            {
                lastStatus: settlement.status,
                // NUL bytes stripped because Postgres `text` refuses them, and an
                // error message can quote a file's content back — logger files
                // made entirely of NUL bytes exist. Failing to record the error
                // would fail the settle, leaving the file pending forever.
                lastError: settlement.status === RunFileStatusEnum.FAILED
                    ? (settlement.errorMessage ?? 'Unknown error').replace(/\u0000/g, '')
                    : settlement.errorMessage?.replace(/\u0000/g, '') ?? null,
                operationId: settlement.status === RunFileStatusEnum.FAILED
                    ? (settlement.operationId ?? null)
                    : null,
                lastProcessMs: settlement.processMs ?? null,
                lastTransferMs: settlement.transferMs ?? null,
                observationRows: settlement.status === RunFileStatusEnum.SUCCESS
                    ? (settlement.observationRows ?? null)
                    : null,
                lastProcessedAt: new Date(),
            },
        );
    }

    /**
     * Insert-or-update one batch of run-file outcomes. Export only — import
     * settles its rows individually as it drains, because it already has their
     * ids from `claimPending` and wants each one durable before moving on.
     */
    public async recordBatch(records: RunFileUpsert[]): Promise<void> {
        if (records.length === 0) {
            return;
        }

        for (let i = 0; i < records.length; i += ConnectorRunFileService.UPSERT_CHUNK) {
            const chunk = records.slice(i, i + ConnectorRunFileService.UPSERT_CHUNK).map(r => ({
                connectorId: r.connectorId,
                bindingId: r.bindingId,
                specificationId: r.specificationId,
                stationId: r.stationId,
                remotePath: r.remotePath,
                fileMtime: r.fileMtime,
                fileSize: r.fileSize,
                lastStatus: r.lastStatus,
                lastError: r.lastError,
                connectorRunId: r.connectorRunId,
                operationId: r.operationId,
                lastProcessMs: r.lastProcessMs,
                lastTransferMs: r.lastTransferMs,
                // The one field a caller does not supply: every row of a batch
                // gets the same instant, stamped here.
                lastProcessedAt: new Date(),
            }));

            await this.repo
                .createQueryBuilder()
                .insert()
                .into(ConnectorRunFileEntity)
                .values(chunk)
                .orUpdate(
                    ['specification_id', 'station_id', 'file_mtime', 'file_size', 'last_status', 'last_error', 'connector_id', 'operation_id', 'last_process_ms', 'last_transfer_ms', 'last_processed_at'],
                    // Must name the identity index, which is run- and
                    // binding-scoped.
                    ['connector_run_id', 'binding_id', 'remote_path'],
                )
                .execute();
        }
    }

    /**
     * Paginated per-file detail for one run (import or export) — backs the
     * connector-run "files" drill-down.
     */
    public async findByRun(runId: number, query: RunFilesQuery): Promise<{ files: ConnectorRunFileEntity[]; total: number }> {
        // Every filter is ANDed onto the same WHERE, so a search narrows
        // whatever status is already selected rather than replacing it.
        const where: FindOptionsWhere<ConnectorRunFileEntity> = { connectorRunId: runId };
        if (query.status) {
            where.lastStatus = query.status;
        }

        const pathPattern: string | null = ConnectorRunFileService.toPathPattern(query.search);
        if (pathPattern !== null) {
            where.remotePath = ILike(pathPattern);
        }

        // A file the server listed without a modified time cannot satisfy a
        // date filter, and SQL comparison already excludes null, so no special
        // case is needed here.
        if (query.fromDate && query.toDate) {
            where.fileMtime = Between(query.fromDate, query.toDate);
        } else if (query.fromDate) {
            where.fileMtime = MoreThanOrEqual(query.fromDate);
        } else if (query.toDate) {
            where.fileMtime = LessThanOrEqual(query.toDate);
        }

        const page = query.page && query.page > 0 ? query.page : 1;
        const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 100;

        const [files, total] = await this.repo.findAndCount({
            where,
            order: { remotePath: 'ASC' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return { files, total };
    }

    /**
     * A sysadmin's search text to a SQL LIKE pattern, or null for no filter.
     *
     * The syntax is the one they already know from a binding's file pattern:
     * `*` matches any run of characters. Text with no `*` in it is treated as
     * "contains", because typing a station name and being told there are no
     * matches — when the name is a directory halfway along the path — reads as
     * a broken search rather than a strict one.
     *
     * LIKE's own metacharacters are escaped first, so a path holding `%` or `_`
     * is searched for literally. Backslash is escaped first of the three,
     * otherwise it would escape the escapes added after it.
     */
    private static toPathPattern(search: string | undefined): string | null {
        const text: string = (search ?? '').trim();
        if (text === '') {
            return null;
        }
        const escaped: string = text
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
        return escaped.includes('*')
            ? escaped.replace(/\*/g, '%')
            : `%${escaped}%`;
    }

    /**
     * The retained operation directory for one failed file, if it still has one.
     *
     * Guards the download endpoint: a sysadmin may only fetch a directory some
     * run-file row still points at, which is what stops the operation id in a
     * URL being a way to read arbitrary directories off the operations volume.
     */
    public async findRetainedOperationId(
        runId: number,
        bindingId: number,
        remotePath: string,
    ): Promise<string | null> {
        const row = await this.repo.findOne({
            where: { connectorRunId: runId, bindingId, remotePath },
            select: { operationId: true },
        });
        return row?.operationId ?? null;
    }

    /**
     * Operation directories still referenced by a retained (failed) file.
     * Used by the orphaned-operation cleanup sweep.
     */
    public async findReferencedOperationIds(): Promise<Set<string>> {
        const rows = await this.repo.find({
            where: { operationId: Not(IsNull()) },
            select: { operationId: true },
        });
        return new Set(rows.map(r => r.operationId as string));
    }

    /**
     * Retained operation directories belonging to one run. Read before deleting
     * a run so the directories can be removed with it rather than waiting for
     * the orphan sweep to notice them (the sweep stays as the backstop).
     */
    public async findOperationIdsByRun(runId: number): Promise<string[]> {
        const rows = await this.repo.find({
            where: { connectorRunId: runId, operationId: Not(IsNull()) },
            select: { operationId: true },
        });
        return rows.map(r => r.operationId as string);
    }

    /**
     * As above, for a set of runs — the bulk delete's disk cleanup, in one query
     * rather than one per run.
     */
    public async findOperationIdsByRuns(runIds: number[]): Promise<string[]> {
        if (runIds.length === 0) {
            return [];
        }

        const rows = await this.repo.find({
            where: { connectorRunId: In(runIds), operationId: Not(IsNull()) },
            select: { operationId: true },
        });
        return rows.map(r => r.operationId as string);
    }

    /**
     * Drop de-dup rows so the next connector run re-ingests the matching files.
     * Backs the "reprocess" admin action (only ever called for import
     * connectors).
     *  - no options: the whole connector
     *  - specificationId: only files bound to that source spec
     *  - since: only files whose mtime is on/after this instant
     */
    /**
     * Drop a connector's outstanding work, keeping everything already settled.
     *
     * A `pending` row is a plan, not a result: it records that some file needed
     * doing under the specification mapping in force when it was discovered.
     * Once that mapping changes the plan is wrong — the row still carries the
     * old source specification and station, and the drain reads them from the
     * row, not from the connector. Deleting them makes the next run re-list and
     * re-plan under the new mapping.
     *
     * Settled rows are untouched, so de-duplication and failure tracing survive:
     * files that were pending simply join against nothing next time and come
     * back as pending again.
     */
    public async discardPending(connectorId: number): Promise<number> {
        const result = await this.repo.delete({
            connectorId,
            lastStatus: RunFileStatusEnum.PENDING,
        });
        return result.affected ?? 0;
    }

}

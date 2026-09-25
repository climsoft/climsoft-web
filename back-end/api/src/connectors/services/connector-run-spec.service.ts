import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorRunSpecEntity } from '../entities/connector-run-spec.entity';

/**
 * One connector binding's row for one run, as a caller supplies it: every stored
 * column, and nothing else. See ConnectorRunSpecEntity for what each means.
 *
 * Derived from the entity rather than written out again, because it WAS written
 * out again and the duplicate field list was a standing hazard: every column
 * added to this tier had to be repeated here, and the compiler could not tell
 * that a caller had been left behind. `Omit` of the one relation gives the same
 * list for free, and — being all-required — still forces a caller to state every
 * figure, including the zeros. That is the property worth keeping over
 * TypeORM's own `QueryDeepPartialEntity`, which would let a missing column
 * compile and write a silent default.
 *
 * The relation is omitted because it is the FK column in object form: a caller
 * sets `connectorRunId`, never a whole run entity.
 */
export type RunSpecInsert = Omit<ConnectorRunSpecEntity, 'connectorRun'>;

/**
 * One binding's drain progress. Keyed by `bindingId` wherever it is collected,
 * which is why there is no longer a composite map-key helper: the binding id IS
 * the key, and building one out of a specification and a station was what let
 * two bindings of the same specification share a bucket.
 */
export interface RunSpecProgress {
    bindingId: number;
    succeeded: number;
    failed: number;
    empty: number;
    /** Observations written by this batch's successful files. */
    observationRows: number;
    processMs: number;
    transferMs: number;
}

/**
 * The per-spec tier of a connector run — see ConnectorRunSpecEntity. Rows are
 * insert-only (one per spec per run) and cascade away with their run.
 */
@Injectable()
export class ConnectorRunSpecService {
    private readonly logger = new Logger(ConnectorRunSpecService.name);

    constructor(
        @InjectRepository(ConnectorRunSpecEntity)
        private readonly repo: Repository<ConnectorRunSpecEntity>,
    ) { }

    /**
     * Write one run's per-spec stats. Bounded by the connector's spec count, so
     * this is a single statement — no chunking needed.
     */
    public async recordBatch(records: RunSpecInsert[]): Promise<void> {
        if (records.length === 0) {
            return;
        }
        await this.repo.insert(records);
    }

    /**
     * Add one ingestion batch's outcomes to the spec rows of a run.
     *
     * Import writes the spec row at discovery, carrying the scan-side numbers,
     * then accumulates the process-side numbers here as the backlog drains.
     * Incrementing in SQL rather than tracking totals in memory is what lets a
     * run be resumed by a different process: whatever earlier batches committed
     * is already in the row, so a resumed drain needs no bookkeeping to
     * reconstruct.
     */
    public async addProgress(
        connectorRunId: number,
        bySpec: Map<number, RunSpecProgress>,
    ): Promise<void> {
        for (const progress of bySpec.values()) {
            await this.repo.query(
                `UPDATE connector_run_specs
                 SET succeeded_count = succeeded_count + $3,
                     failed_count    = failed_count + $4,
                     empty_count     = empty_count + $5,
                     process_ms      = process_ms + $6,
                     transfer_ms     = transfer_ms + $7,
                     observation_rows   = observation_rows + $8
                 WHERE connector_run_id = $1
                   AND binding_id       = $2`,
                [connectorRunId, progress.bindingId,
                 progress.succeeded, progress.failed, progress.empty, progress.processMs, progress.transferMs,
                 progress.observationRows],
            );
        }
    }

    /**
     * Replace an import run's per-spec counts with the truth from its run files,
     * repairing whatever drift the per-batch increments accumulated.
     *
     * These rows are the only place a run's totals come from — the run tier is
     * summed from them on read — so their accuracy is not cosmetic. They are
     * incremented per batch so a long drain shows live progress, but an
     * increment is a separate statement from the settle it describes, and a
     * process dying between the two leaves the count permanently low. Every run
     * records a full snapshot, so its file rows are authoritative and the spec
     * counts are a cache over them.
     *
     * IMPORT ONLY, because only an import accumulates. An export writes its file
     * rows and its spec rows together in one batch at the end of the run, from
     * the same in-memory outcomes, so there is no drift for this to repair.
     *
     * `scanned_count`, `scan_ms`, `file_pattern`, `specification_id` and
     * `station_id` are untouched.
     * None are derivable — files scanned but not matched by the glob are never
     * written, wall time is not a property of any row, and the pattern is a
     * snapshot of configuration that may since have been edited.
     *
     * A spec whose pattern failed to parse has no run files, so the join finds
     * nothing and its zero-filled row is left exactly as discovery wrote it.
     */
    public async reconcileFromRunFiles(connectorRunId: number): Promise<void> {
        await this.repo.query(
            `UPDATE connector_run_specs s
             SET matched_count   = agg.matched,
                 succeeded_count = agg.succeeded,
                 skipped_count   = agg.skipped,
                 failed_count    = agg.failed,
                 empty_count     = agg.empty,
                 excluded_count  = agg.excluded,
                 process_ms      = agg.process_ms,
                 transfer_ms     = agg.transfer_ms,
                 observation_rows   = agg.observation_rows
             FROM (
                 -- Grouped by the BINDING, which is now a single column on the
                 -- file rows. Grouping by what a binding points at — its
                 -- specification, or its specification and station — merged
                 -- bindings that share those, and then wrote the merged total to
                 -- every one of them.
                 SELECT binding_id,
                        -- Excluded rows are in this table but are NOT matches:
                        -- nothing was downloaded or attempted for them, and
                        -- counting them here would inflate every total summed
                        -- from this tier.
                        count(*) FILTER (WHERE last_status <> 'excluded')     AS matched,
                        count(*) FILTER (WHERE last_status = 'excluded')      AS excluded,
                        count(*) FILTER (WHERE last_status = 'success')      AS succeeded,
                        count(*) FILTER (WHERE last_status = 'skipped')      AS skipped,
                        count(*) FILTER (WHERE last_status = 'failed')       AS failed,
                        count(*) FILTER (WHERE last_status = 'empty')        AS empty,
                        LEAST(2147483647, coalesce(sum(last_process_ms), 0))  AS process_ms,
                        LEAST(2147483647, coalesce(sum(last_transfer_ms), 0)) AS transfer_ms,
                        coalesce(sum(observation_rows), 0)                       AS observation_rows
                 FROM connector_run_files
                 WHERE connector_run_id = $1
                 GROUP BY binding_id
             ) agg
             WHERE s.connector_run_id = $1
               AND s.binding_id       = agg.binding_id`,
            [connectorRunId],
        );
    }

    /**
     * For each of these bindings, the newest run that actually covered it —
     * the baseline its change detection compares against.
     *
     * Resolved PER BINDING rather than once per connector, and that distinction
     * is the whole reason a binding can be disabled and switched back on
     * cheaply. The connector-wide baseline is "the newest run holding a
     * snapshot"; a binding that was disabled for that run has no rows in it, so
     * every one of its files would look new and re-enabling would re-import the
     * lot — 280,000 files on a real binding here, hours of work to undo a
     * toggle. Asking per binding instead lands on the last run that really read
     * it, and only genuinely new or changed files are queued.
     *
     * Three conditions decide whether a run counts as a baseline:
     *  - `discovered_at IS NOT NULL` — a half-recorded listing is not a
     *    snapshot, and treating one as a baseline would make every file it
     *    never reached look unchanged.
     *  - `disabled = false` — a disabled row records that the run did NOT cover
     *    the binding. It is the marker to skip, not a snapshot to compare with.
     *  - not the current run, whose own rows are written after discovery but
     *    may survive from an interrupted earlier attempt at it.
     *
     * `matched_count` is deliberately NOT required to be positive. A run that
     * scanned a directory and legitimately found it empty is a perfectly good
     * statement about the world, and skipping it would pin the binding to an
     * older baseline for no reason.
     *
     * Bindings with no qualifying run are absent from the map, which the caller
     * reads as null — a first run, and everything is correctly new.
     */
    public async findBaselineRunIds(bindingIds: number[], currentRunId: number): Promise<Map<number, number>> {
        if (bindingIds.length === 0) {
            return new Map();
        }

        const rows: any = await this.repo.query(
            `SELECT s.binding_id, max(s.connector_run_id) AS prev_run_id
             FROM connector_run_specs s
             JOIN connector_runs r ON r.id = s.connector_run_id
             WHERE s.binding_id = ANY($1::int[])
               AND s.connector_run_id <> $2::bigint
               AND s.disabled = false
               AND r.discovered_at IS NOT NULL
             GROUP BY s.binding_id`,
            [bindingIds, currentRunId],
        );

        return new Map(
            (rows as { binding_id: number; prev_run_id: string }[])
                .map(r => [Number(r.binding_id), Number(r.prev_run_id)]),
        );
    }

    /** Per-spec breakdown for one run — backs the run detail drill-down. */
    public async findByRun(runId: number): Promise<ConnectorRunSpecEntity[]> {
        return this.repo.find({
            where: { connectorRunId: runId },
            order: { scanMs: 'DESC' },
        });
    }
}

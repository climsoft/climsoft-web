import { ConnectorRunSpecModel, ViewConnectorRunModel } from './models/connector-run.model';

/**
 * When a connector run is slow enough to be worth flagging to a sysadmin.
 *
 * Mirrors `back-end/api/src/queue/connector-run-thresholds.ts` — keep the two in
 * step. Thresholds are applied when a run is displayed, never stored on the
 * row, so changing them here re-colours historical runs immediately.
 */
export const CONNECTOR_RUN_THRESHOLDS = {
    run: {
        durationMs: { amber: 10 * 60 * 1000, red: 30 * 60 * 1000 },
        totalScanMs: { amber: 5_000, red: 20_000 },
    },
    spec: {
        scannedCount: { amber: 25_000, red: 100_000 },
        scanMs: { amber: 5_000, red: 20_000 },
    },
};

export type RunSeverity = 'ok' | 'amber' | 'red';

function severityOf(value: number, band: { amber: number; red: number }): RunSeverity {
    if (value >= band.red) return 'red';
    if (value >= band.amber) return 'amber';
    return 'ok';
}

function worst(...severities: RunSeverity[]): RunSeverity {
    if (severities.includes('red')) return 'red';
    if (severities.includes('amber')) return 'amber';
    return 'ok';
}

/** Overall severity for one run, from its duration and total event-loop time. */
export function runSeverity(run: ViewConnectorRunModel): RunSeverity {
    return worst(
        severityOf(run.durationMs, CONNECTOR_RUN_THRESHOLDS.run.durationMs),
        severityOf(run.totalScanMs, CONNECTOR_RUN_THRESHOLDS.run.totalScanMs),
    );
}

/** Severity for one specification within a run. */
export function specSeverity(spec: ConnectorRunSpecModel): RunSeverity {
    return worst(
        severityOf(spec.scannedCount, CONNECTOR_RUN_THRESHOLDS.spec.scannedCount),
        severityOf(spec.scanMs, CONNECTOR_RUN_THRESHOLDS.spec.scanMs),
    );
}

/**
 * Plain-English advice for a flagged specification. Import and export share the
 * colouring but not the remedy: an export never scans an accumulating remote
 * directory, so telling a sysadmin to clean one would send them to the wrong
 * place. `filePattern` is null exactly for export specs.
 */
export function specAdvice(spec: ConnectorRunSpecModel): string | null {
    if (specSeverity(spec) === 'ok') {
        return null;
    }

    if (spec.filePattern === null) {
        return 'Generating this export is slow. This is a database query and file-generation cost, not a file-server one — narrowing the observation window or the station list is what helps here.';
    }

    if (severityOf(spec.scannedCount, CONNECTOR_RUN_THRESHOLDS.spec.scannedCount) !== 'ok') {
        return `This pattern scanned ${spec.scannedCount.toLocaleString()} files. That cost is paid on every run whether or not anything changed — archive the already-processed files out of the directory to bring it down.`;
    }

    return 'Matching this pattern is taking a long time relative to the number of files scanned. Check whether the directory is on slow storage or holds unusually deep nesting.';
}

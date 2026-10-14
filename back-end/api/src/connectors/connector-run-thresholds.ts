/**
 * When a connector run is slow enough to be worth telling a sysadmin about.
 *
 * These are deliberately plain constants rather than a general setting: we have
 * no field data yet to pick good values from, and because thresholds are only
 * ever applied when a run is *displayed* (never baked into a stored row),
 * retuning them here re-colours historical runs with no migration. Promote to
 * an editable setting once real deployments say what the right numbers are.
 *
 * The frontend mirrors these in
 * `admin/connector-logs/connector-run-thresholds.ts` — keep the two in step.
 */
export const CONNECTOR_RUN_THRESHOLDS = {
    /** Whole run, wall clock. */
    run: {
        durationMs: { amber: 10 * 60 * 1000, red: 30 * 60 * 1000 },
        /**
         * Total event-loop time spent matching and diffing listings. Same
         * numbers as the per-spec threshold on purpose: one spec at 20s and
         * four specs at 6s block the loop for about as long, so both should
         * flag — the per-spec tier is what then tells them apart.
         */
        totalScanMs: { amber: 5_000, red: 20_000 },
    },
    /** One specification within a run. */
    spec: {
        /** Files in the spec's directory scope — grows with the file server. */
        scannedCount: { amber: 25_000, red: 100_000 },
        scanMs: { amber: 5_000, red: 20_000 },
    },
} as const;

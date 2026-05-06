/**
 * DuckDB SQL macros used by Wis2BoxExportService.
 *
 * Each macro is exported as a `CREATE OR REPLACE MACRO ...` statement string.
 * `Wis2BoxExportService.onModuleInit` runs each one against the shared DuckDB
 * connection so the macros are available to subsequent SYNOP/DAYCLI/CLIMAT
 * generation queries.
 *
 * Macros are inlined at query planning time — no per-row function-call
 * overhead, and the optimizer can analyse the body. Use them for spec-shaped
 * categorical encodings that would otherwise be repeated CASE WHEN inline
 * across multiple generators.
 */

/**
 * SYNOP FM-12 "characteristic of pressure tendency" code (BUFR 0 10 063).
 *
 * Classifies the shape of station-pressure change over the past 3 hours into
 * a single digit 0-8 per WMO definitions. Units do not matter — only
 * relative changes are used. Returns NULL if any input is NULL.
 */
export const PRESSURE_TENDENCY_FM12_MACRO_SQL = `
CREATE OR REPLACE MACRO pressure_tendency_fm12(p_now, p_1h_ago, p_2h_ago, p_3h_ago) AS (
    CASE
        WHEN p_now IS NULL OR p_1h_ago IS NULL OR p_2h_ago IS NULL OR p_3h_ago IS NULL THEN NULL

        -- Code 4: completely steady
        WHEN p_now = p_3h_ago AND p_1h_ago = p_now AND p_2h_ago = p_now THEN 4

        -- Net rising (delta > 0)
        WHEN p_now > p_3h_ago THEN
            CASE
                -- Code 0: rose then fell, ending >= 3h ago (peak in middle)
                WHEN GREATEST(p_2h_ago, p_1h_ago) > p_now
                 AND GREATEST(p_2h_ago, p_1h_ago) > p_3h_ago THEN 0
                -- Code 1: decelerating rise (increasing more slowly, or to steady)
                WHEN (p_now - p_1h_ago) < (p_1h_ago - p_2h_ago)
                 AND (p_1h_ago - p_2h_ago) > 0 THEN 1
                -- Code 3: accelerating rise (or rose after steady/dip)
                WHEN (p_now - p_1h_ago) > (p_1h_ago - p_2h_ago)
                 AND (p_1h_ago - p_2h_ago) >= 0 THEN 3
                -- Code 2: steady rise
                ELSE 2
            END

        -- Net falling (delta < 0)
        WHEN p_now < p_3h_ago THEN
            CASE
                -- Code 5: fell then rose, ending <= 3h ago (trough in middle)
                WHEN LEAST(p_2h_ago, p_1h_ago) < p_now
                 AND LEAST(p_2h_ago, p_1h_ago) < p_3h_ago THEN 5
                -- Code 6: decelerating fall (decreasing more slowly, or to steady)
                WHEN (p_now - p_1h_ago) > (p_1h_ago - p_2h_ago)
                 AND (p_1h_ago - p_2h_ago) < 0 THEN 6
                -- Code 8: accelerating fall (or rose then fell)
                WHEN (p_now - p_1h_ago) < (p_1h_ago - p_2h_ago)
                 AND (p_1h_ago - p_2h_ago) <= 0 THEN 8
                -- Code 7: steady fall
                ELSE 7
            END

        -- delta = 0 but there has been movement (peak or trough returns to start)
        WHEN GREATEST(p_2h_ago, p_1h_ago) > p_3h_ago THEN 0
        WHEN LEAST(p_2h_ago, p_1h_ago)    < p_3h_ago THEN 5
        ELSE 4
    END
);
`;

/**
 * Maps a climsoft station's observation_processing_method enum value
 * ('automatic' | 'manual' | 'hybrid') to the WMO station-type code expected
 * by WIS2BOX:
 *   automatic -> 0
 *   manual    -> 1
 *   hybrid    -> 3
 *
 * Returns NULL for unrecognised or NULL input.
 *
 * Used by both SYNOP and (eventually) CLIMAT generators — extracted so the
 * mapping isn't duplicated across the per-report-type SQL.
 */
export const WMO_STATION_TYPE_MACRO_SQL = `
CREATE OR REPLACE MACRO wmo_station_type(processing_method) AS (
    CASE processing_method
        WHEN 'automatic' THEN 0
        WHEN 'manual'    THEN 1
        WHEN 'hybrid'    THEN 3
        ELSE NULL
    END
);
`;

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
 * Encoding: **WMO FM-12 / BUFR 0 10 063 categorical table** (codes 0-8).
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
 *   hybrid    -> 2
 *
 * Encoding: **WMO station-type categorical lookup** (no formula — direct mapping).
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
        WHEN 'hybrid'    THEN 2
        ELSE NULL
    END
);
`;


/**
 * Dew-point temperature from dry-bulb + wet-bulb temperatures.
 *
 * Formula: **Magnus formula via the psychrometric (wet-bulb) equation.**
 *   - e_s(T) = 6.1078 · exp(17.269 · T / (237.314 + T))     (saturation vapour pressure, Magnus)
 *   - e_a    = e_s(T_wet) − 0.63 · (T_dry − T_wet)          (psychrometric correction)
 *   - T_dew  = 237.314 · ln(e_a/6.1078) / (17.269 − ln(e_a/6.1078))   (inverse Magnus)
 *
 * Inputs / outputs are SI (Kelvin). The math is done in °C internally because
 * the Magnus coefficients are tuned for the Celsius scale; the K↔°C conversion
 * (subtract/add 273.15) is just a shift and doesn't alter the formula.
 *
 * Returns NULL if either input is NULL.
 */
export const CALCULATE_DEWPOINT_MACRO_SQL = `
CREATE OR REPLACE MACRO calculate_dewpoint(dry_bulb_k, wet_bulb_k) AS (
    CASE
        WHEN dry_bulb_k IS NULL OR wet_bulb_k IS NULL THEN NULL
        ELSE NULL -- TODO. commented temporarily (
            -- Scalar subquery computes LN(e_a / 6.1078) once, then reused in
            -- numerator and denominator of the inverse-Magnus expression.
            -- (T_F_diff = 9/5 * T_C_diff, so the original 0.35 psychrometric
            -- coefficient in °F becomes 0.63 in °C.)
            -- SELECT ROUND(237.314 * ln_e / (17.269 - ln_e) + 273.15, 2)
            -- FROM (
            --    SELECT LN(
            --        (
            --            6.1078 * EXP(
            --                (17.269 * (wet_bulb_k - 273.15))
            --                / (237.314 + (wet_bulb_k - 273.15))
            --            )
            --            - 0.63 * (dry_bulb_k - wet_bulb_k)
            --        ) / 6.1078
            --    ) AS ln_e
            -- )
        -- )
    END
);
`;

/**
 * Relative humidity (%) from dew-point + dry-bulb temperatures.
 *
 * Formula: **Magnus formula — ratio of saturation vapour pressures.**
 *   - e_s(T) = 6.11 · 10^(7.5·T / (237.3 + T))   (Magnus, base-10 form)
 *   - RH     = e_s(T_dew) / e_s(T_dry) · 100
 *
 * Inputs are SI (Kelvin); the Magnus formula is applied in °C internally.
 * Output is dimensionless (%).
 *
 * Returns NULL if either input is NULL.
 */
export const CALCULATE_RH_MACRO_SQL = `
CREATE OR REPLACE MACRO calculate_rh(dew_point_k, dry_bulb_k) AS (
    CASE
        WHEN dew_point_k IS NULL OR dry_bulb_k IS NULL THEN NULL
        ELSE NULL -- TODO. commented temporarily. ROUND(
            -- (
            --    POW(10, (7.5 * (dew_point_k - 273.15)) / (237.3 + (dew_point_k - 273.15)))
            --    /
            --    POW(10, (7.5 * (dry_bulb_k  - 273.15)) / (237.3 + (dry_bulb_k  - 273.15)))
            -- ) * 100, 0)
    END
);
`;

/**
 * Geopotential height (m) at a standard pressure level from station pressure,
 * dry-bulb temperature, station elevation and the target pressure level.
 *
 * Formula: **Hypsometric equation with virtual-temperature lapse correction.**
 *   - Standard lapse rate gamma = 0.0065 K/m
 *   - g = 9.80665 m/s², R = 287.04 J/(kg·K)
 *   - z = (h + (R/g)·ln(P/P_level)·(T + γ·h/2)) / (1 + (R/g)·ln(P/P_level)·γ/2)
 *
 * All inputs are SI: pressure in Pa, temperature in K, elevation in m.
 * Output is rounded geopotential height in m.
 *
 * Returns NULL if any input is NULL.
 */
export const CALCULATE_GEOPOTENTIAL_MACRO_SQL = `
CREATE OR REPLACE MACRO calculate_geopotential(ppp_pa, dry_bulb_k, elevation_m, level_pa) AS (
    CASE
        WHEN ppp_pa IS NULL OR dry_bulb_k IS NULL OR elevation_m IS NULL OR level_pa IS NULL THEN NULL
        ELSE NULL -- TODO. commented temporarily. (
            -- Scalar subquery computes log_term = LN(P/P_level) once.
            -- Constants inlined: R/g = 287.04 / 9.80665, gamma/2 = 0.0065 / 2.
            -- SELECT ROUND(
            --    (elevation_m + (287.04 / 9.80665) * log_term * (dry_bulb_k + (0.0065 / 2) * elevation_m)) /
            --    (1 + (287.04 / 9.80665) * log_term * (0.0065 / 2)), 0)
            -- FROM (SELECT LN(ppp_pa / level_pa) AS log_term)
        -- )
    END
);
`;

/**
 * Mean sea-level pressure (Pa) from station pressure, dry-bulb temperature and
 * station elevation.
 *
 * Formula: **Barometric (hypsometric) formula, standard atmosphere.**
 *   - Standard lapse rate gamma = 0.0065 K/m
 *   - MSLP = P_station · (1 − γ·h / (T + γ·h))^(−5.257)
 *     (algebraically equivalent to the more common (1 + γ·h/T)^5.257 form)
 *
 * Inputs are SI: pressure in Pa, temperature in K, elevation in m.
 * Output is rounded MSL pressure in Pa.
 *
 * Note: a prior version of this macro multiplied the result by 10 to encode
 * pressure as integer tenths of hPa — a SYNOP coded-message wire convention,
 * not part of the physics. Removed here so the output is plain Pa as required
 * by WIS2BOX/BUFR. If a caller ever needs the coded-message form, apply the
 * × 10 at the encoding stage, not inside this physics macro.
 *
 * Returns NULL if any input is NULL.
 */
export const CALCULATE_MSLP_MACRO_SQL = `
CREATE OR REPLACE MACRO calculate_mslp(ppp_pa, dry_bulb_k, elevation_m) AS (
    CASE
        WHEN ppp_pa IS NULL OR dry_bulb_k IS NULL OR elevation_m IS NULL THEN NULL
        ELSE NULL -- TODO. commented temporarily. ROUND(
            -- ppp_pa * POW(
            --    1 - 0.0065 * elevation_m / (dry_bulb_k + 0.0065 * elevation_m),
            --    -5.257
            -- ), 1)
    END
);
`;


-- ============================================================================
--  RAIN GAUGE FILE  ->  TIDY TABLE            (Climsoft Web adapter, DuckDB SQL)
-- ============================================================================
--
--  WHAT THIS SCRIPT DOES
--  The rain gauge exports a tab-separated text file. This script turns it into
--  a simple table, one row per reading time, with these columns:
--
--      date_time          when the reading was taken
--      rain               rainfall (mm)
--      rain_valid_pct     % of valid samples behind the rain value
--      battery_voltage    battery as a voltage       (blank if the file uses %)
--      battery_percent    battery as a percentage    (blank if the file uses V)
--      battery_valid_pct  % of valid samples behind the battery value
--
--  WHY IT IS NEEDED
--  Loggers are set up differently at each site, so their files differ:
--    * Columns are not always in the same place, and some files have extra
--      columns (for example internal temperature).
--    * Battery is sometimes a voltage ("POWER (V)") and sometimes a charge
--      level in percent ("BATTLevel (%)").
--    * Some files have a "ValidDataPerc" column after a reading, showing what
--      percentage of samples behind that reading were valid. Others do not.
--    * Times are sometimes 12-hour ("2:30:00 PM") and sometimes 24-hour
--      ("14:30:00").
--    * Missing readings are written as -999990.00.
--  Rather than assume where things are, the script reads the file's own header
--  to find the columns it needs.
--
--  HOW THE FILE'S HEADER IS LAID OUT
--  The first two lines describe the columns. For example:
--
--      Date/time | RAIN (mm) | (blank)       | POWER (V) | (blank)
--                | Tot       | ValidDataPerc | Inst      | ValidDataPerc
--
--  Line 1 names each measurement once, above its first column. Columns that
--  belong to the same measurement are left blank. Line 2 says what each column
--  holds: the reading itself ("Tot", "Inst") or its quality ("ValidDataPerc").
--
--  WHAT THIS SCRIPT DOES NOT DO
--  It does not decide which Climsoft element each column becomes. That is set
--  in the import specification in Climsoft Web, where it can be seen and
--  changed without editing this script.
--
--  WHEN TO USE THE PYTHON OR JAVASCRIPT VERSION INSTEAD
--  This SQL version has two limits the other versions do not:
--    * If one file holds two exports joined together with different column
--      layouts, only the first layout is used.
--    * If a file has no readings at all, it produces an empty table instead of
--      reporting an error.
--
--  RUNNING IT BY HAND (for testing only)
--  Remove the "-- " at the start of the two SET VARIABLE lines below, fill in
--  your input file and output folder, then run:   duckdb < transform.sql
--  When Climsoft Web runs this script, it fills both in automatically.
-- ============================================================================


-- SET VARIABLE climsoft_input_file_path_name = 'C:/path/to/Elab.txt';
-- SET VARIABLE climsoft_output_dir = 'C:/path/to/output_dir';

-- HELPER 1: clean(value)
-- Tidies a single reading before it goes into the output table.
--   * Empty cells, text that is not a number, and missing-data markers such as
--     -999990.00 (any value of -9999 or lower) become an empty cell.
--   * A real reading is kept exactly as written in the file.
CREATE OR REPLACE TEMP MACRO clean(x) AS (
    CASE
        WHEN x IS NULL OR trim(x) = '' THEN ''
        WHEN try_cast(trim(x) AS DOUBLE) IS NULL THEN ''
        WHEN try_cast(trim(x) AS DOUBLE) <= -9999 THEN ''
        ELSE trim(x)
    END
);

-- HELPER 2: nth(row, position)
-- Picks the value at a given column position in a row. If that column does not
-- exist in this file (for example, there is no quality column), it returns
-- nothing instead of failing.
CREATE OR REPLACE TEMP MACRO nth(lst, idx) AS (
    CASE WHEN idx IS NULL OR idx > len(lst) THEN NULL ELSE lst[idx] END
);

COPY (
WITH
-- STEP 1. Read the file and number its lines.
--   Each line is numbered by its position in the file (1, 2, 3, ...). The order
--   matters: the header has to be found before the readings below it.
--   Windows-style line endings are removed so they do not stick to the last
--   value on each line.
src_lines AS (
    SELECT
        i AS ln,
        replace(arr[i], chr(13), '') AS line
    FROM (
        SELECT string_split(content, chr(10)) AS arr
        FROM read_text(getvariable('climsoft_input_file_path_name'))   -- the input file
    ),
    unnest(range(1, len(arr) + 1)) AS t(i)
),

-- STEP 2. Find the header.
--   The header starts on the line beginning with "Date/time". That line holds
--   the measurement names; the line straight after it says what each column
--   holds. Both lines are split into their cells at each tab.
header_line AS (
    SELECT min(ln) AS h
    FROM src_lines
    WHERE starts_with(trim(line), 'Date/time')
),
header_cells AS (
    SELECT string_split(hl.line, chr(9)) AS hf,
           string_split(sl.line, chr(9)) AS sf
    FROM header_line
    JOIN src_lines hl ON hl.ln = header_line.h
    JOIN src_lines sl ON sl.ln = header_line.h + 1
),

-- STEP 3. Work out what each column is.
--   List every column with what it holds (from line 2 of the header). Then give
--   every column a measurement name: a blank name means "same measurement as
--   the column to its left", so each blank takes the nearest name before it.
--
--   Example:  the header cells  "RAIN (mm)", "",          "POWER (V)", ""
--             are read as       "RAIN (mm)", "RAIN (mm)", "POWER (V)", "POWER (V)"
cols AS (
    SELECT
        i,
        trim(hf[i]) AS raw_name,
        CASE WHEN i <= len(sf) THEN trim(sf[i]) ELSE '' END AS agg
    FROM header_cells, unnest(range(1, len(hf) + 1)) AS t(i)
),
cols_filled AS (
    SELECT
        i,
        agg,
        last_value(nullif(raw_name, '') IGNORE NULLS)
            OVER (ORDER BY i ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS name
    FROM cols
),

-- STEP 4. Choose the columns to keep.
--   From all the columns, pick the positions of four:
--     rain_col           the rain reading       name contains "rain"
--     rain_valid_col     its quality column     rain, marked "ValidDataPerc"
--     battery_col        the battery reading    name contains "pow" or "batt"
--     battery_valid_col  its quality column     battery, marked "ValidDataPerc"
--   If more than one column matches, the leftmost is used. If none matches,
--   that output column is left blank.
layout AS (
    SELECT
        min(CASE WHEN contains(lower(name), 'rain')
                  AND lower(agg) <> 'validdataperc' AND agg <> '' THEN i END) AS rain_col,
        min(CASE WHEN contains(lower(name), 'rain')
                  AND lower(agg) = 'validdataperc' THEN i END) AS rain_valid_col,
        min(CASE WHEN (contains(lower(name), 'pow') OR contains(lower(name), 'batt'))
                  AND lower(agg) <> 'validdataperc' AND agg <> '' THEN i END) AS battery_col,
        min(CASE WHEN (contains(lower(name), 'pow') OR contains(lower(name), 'batt'))
                  AND lower(agg) = 'validdataperc' THEN i END) AS battery_valid_col
    FROM cols_filled
),

-- STEP 5. Decide whether the battery is a voltage or a percentage.
--   The unit is read from the brackets in the battery name:
--     "POWER (V)"     ->  V  ->  voltage
--     "BATTLevel (%)" ->  %  ->  percent
--   Any other unit counts as unknown, and both battery columns stay blank rather
--   than risk putting the reading in the wrong one.
battery_kind AS (
    SELECT
        l.*,
        (SELECT regexp_extract(cf.name, '\(([^)]*)\)', 1)
         FROM cols_filled cf WHERE cf.i = l.battery_col) AS battery_unit
    FROM layout l
),
layout2 AS (
    SELECT
        rain_col, rain_valid_col, battery_col, battery_valid_col,
        CASE
            WHEN battery_unit IS NULL OR battery_unit = '' THEN NULL
            WHEN contains(battery_unit, '%') THEN 'percent'
            WHEN contains(lower(battery_unit), 'v') THEN 'voltage'
            ELSE NULL
        END AS battery_kind
    FROM battery_kind
),

-- STEP 6. Collect the readings.
--   Every non-empty line below the two header lines is a row of readings.
--   Each one is split into its cells at each tab.
data_rows AS (
    SELECT string_split(l.line, chr(9)) AS d
    FROM src_lines l, header_line
    WHERE l.ln > header_line.h + 1 AND trim(l.line) <> ''
),

-- STEP 7. Read the date and time.
--   Dates are day/month/year. The script tries the 12-hour format first
--   ("13/12/2023 2:30:00 PM"), then the 24-hour format ("13/12/2023 14:30:00").
--   A line whose date cannot be read either way is skipped.
parsed AS (
    SELECT
        try_strptime(trim(d[1]),
            ['%d/%m/%Y %I:%M:%S %p', '%d/%m/%Y %H:%M:%S']) AS ts,
        d
    FROM data_rows
)

-- STEP 8. Build the output table and save it.
--   For each row of readings, take the values from the columns chosen in
--   step 4 and tidy them with clean(). The battery reading goes into the voltage
--   or the percent column (step 5); the other one is left blank. Times are
--   written as YYYY-MM-DD HH:MM:SS, rows are sorted earliest first, and the
--   result is saved as output.csv in the output folder.
SELECT
    strftime(p.ts, '%Y-%m-%d %H:%M:%S')                     AS date_time,
    clean(nth(p.d, ly.rain_col))                             AS rain,
    clean(nth(p.d, ly.rain_valid_col))                       AS rain_valid_pct,
    CASE WHEN ly.battery_kind = 'voltage'
         THEN clean(nth(p.d, ly.battery_col)) ELSE '' END    AS battery_voltage,
    CASE WHEN ly.battery_kind = 'percent'
         THEN clean(nth(p.d, ly.battery_col)) ELSE '' END    AS battery_percent,
    clean(nth(p.d, ly.battery_valid_col))                    AS battery_valid_pct
FROM parsed p, layout2 ly
WHERE p.ts IS NOT NULL
ORDER BY date_time            -- earliest first
)
TO (getvariable('climsoft_output_dir') || '/output.csv') WITH (HEADER, DELIMITER ',');
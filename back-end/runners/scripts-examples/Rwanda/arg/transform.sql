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
--  A FILE WITH SEVERAL EXPORTS
--  If a file holds several exports joined together, each one is read with its
--  own header, so exports with different columns can be mixed in one file.
--
--  WHEN TO USE THE PYTHON VERSION INSTEAD
--  This SQL version gives the same output as the Python version, with three
--  differences:
--    * It writes no warnings. The Python version reports a row it skipped
--      because its date could not be read, a missing rain or battery column,
--      and a battery unit it does not recognise.
--    * A file containing a byte that is not valid UTF-8 fails here. The Python
--      version replaces the byte and reads the file.
--    * A first header cell such as "Date/time (UTC)" is accepted here. The
--      Python version needs it to be exactly "Date/time".
--  A file with no readings at all fails the run in both versions.
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
--     -999990.00 (any value of -9999 or lower) become an empty cell. They are
--     returned as NULL, which the CSV writer leaves empty; an empty string
--     would be written as "" instead.
--   * A real reading is kept exactly as written in the file.
CREATE OR REPLACE TEMP MACRO clean(x) AS (
    CASE
        WHEN x IS NULL OR trim(x) = '' THEN NULL
        WHEN try_cast(trim(x) AS DOUBLE) IS NULL THEN NULL
        WHEN try_cast(trim(x) AS DOUBLE) <= -9999 THEN NULL
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

-- The readings are first built into a table, so the script can stop with an error
-- if there are none (step 9) before anything is written.
CREATE OR REPLACE TABLE arg_rows AS
WITH
-- STEP 1. Read the file and number its lines.
--   Each line is numbered by its position in the file (1, 2, 3, ...). The order
--   matters: a header has to be found before the readings below it.
--   Every kind of line break is turned into a plain one first, so a file reads
--   the same whether its lines end in CRLF (Windows), a lone CR, or one of the
--   other separators the Python version also treats as line breaks (vertical
--   tab, form feed, and the Unicode line and paragraph separators). Any blank
--   lines this leaves are skipped below.
src_lines AS (
    SELECT
        i AS ln,
        arr[i] AS line
    FROM (
        SELECT string_split(
                   regexp_replace(
                       replace(content, chr(13) || chr(10), chr(10)),
                       '[\r\x0b\x0c\x1c-\x1e\x{85}\x{2028}\x{2029}]', chr(10), 'g'),
                   chr(10)) AS arr
        FROM read_text(getvariable('climsoft_input_file_path_name'))   -- the input file
    ),
    unnest(range(1, len(arr) + 1)) AS t(i)
),

-- STEP 2. Find the headers.
--   A header starts on a line beginning with "Date/time". That line holds the
--   measurement names; the next line that is not blank says what each column
--   holds. A file with several exports joined together has several headers, and
--   each one governs the readings below it, up to the next header.
--   Both lines are split into their cells at each tab.
headers AS (
    SELECT
        h.ln AS h,
        (SELECT min(s.ln) FROM src_lines s
         WHERE s.ln > h.ln AND trim(s.line) <> '') AS sub,
        lead(h.ln) OVER (ORDER BY h.ln) AS next_h
    FROM src_lines h
    WHERE starts_with(trim(h.line), 'Date/time')
),
header_cells AS (
    SELECT hd.h,
           string_split(hl.line, chr(9)) AS hf,
           string_split(sl.line, chr(9)) AS sf
    FROM headers hd
    JOIN src_lines hl ON hl.ln = hd.h
    JOIN src_lines sl ON sl.ln = hd.sub
),

-- STEP 3. Work out what each column is, for each header.
--   List every column with what it holds (from line 2 of the header). Then give
--   every column a measurement name: a blank name means "same measurement as
--   the column to its left", so each blank takes the nearest name before it.
--
--   Example:  the header cells  "RAIN (mm)", "",          "POWER (V)", ""
--             are read as       "RAIN (mm)", "RAIN (mm)", "POWER (V)", "POWER (V)"
cols AS (
    SELECT
        h,
        i,
        trim(hf[i]) AS raw_name,
        CASE WHEN i <= len(sf) THEN trim(sf[i]) ELSE '' END AS agg
    FROM header_cells, unnest(range(1, len(hf) + 1)) AS t(i)
),
cols_filled AS (
    SELECT
        h,
        i,
        agg,
        last_value(nullif(raw_name, '') IGNORE NULLS)
            OVER (PARTITION BY h ORDER BY i ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS name
    FROM cols
),

-- STEP 4. Choose the columns to keep, for each header.
--   From all the columns, pick the positions of four:
--     rain_col           the rain reading       name contains "rain"
--     rain_valid_col     its quality column     rain, marked "ValidDataPerc"
--     battery_col        the battery reading    name contains "pow" or "batt"
--     battery_valid_col  its quality column     battery, marked "ValidDataPerc"
--   If more than one column matches, the leftmost is used. If none matches,
--   that output column is left blank.
layout AS (
    SELECT
        h,
        min(CASE WHEN contains(lower(name), 'rain')
                  AND lower(agg) <> 'validdataperc' AND agg <> '' THEN i END) AS rain_col,
        min(CASE WHEN contains(lower(name), 'rain')
                  AND lower(agg) = 'validdataperc' THEN i END) AS rain_valid_col,
        min(CASE WHEN (contains(lower(name), 'pow') OR contains(lower(name), 'batt'))
                  AND lower(agg) <> 'validdataperc' AND agg <> '' THEN i END) AS battery_col,
        min(CASE WHEN (contains(lower(name), 'pow') OR contains(lower(name), 'batt'))
                  AND lower(agg) = 'validdataperc' THEN i END) AS battery_valid_col
    FROM cols_filled
    GROUP BY h
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
         FROM cols_filled cf WHERE cf.h = l.h AND cf.i = l.battery_col) AS battery_unit
    FROM layout l
),
layout2 AS (
    SELECT
        h, rain_col, rain_valid_col, battery_col, battery_valid_col,
        CASE
            WHEN battery_unit IS NULL OR battery_unit = '' THEN NULL
            WHEN contains(battery_unit, '%') THEN 'percent'
            WHEN contains(lower(battery_unit), 'v') THEN 'voltage'
            ELSE NULL
        END AS battery_kind
    FROM battery_kind
),

-- STEP 6. Collect the readings.
--   Every non-empty line below a header's two lines, and above the next header,
--   is a row of readings governed by that header. Lines before the first header
--   belong to no header and are left out. Each row is split into its cells at
--   each tab.
data_rows AS (
    SELECT l.ln, hd.h, string_split(l.line, chr(9)) AS d
    FROM src_lines l
    JOIN headers hd ON l.ln > hd.sub AND (hd.next_h IS NULL OR l.ln < hd.next_h)
    WHERE trim(l.line) <> ''
),

-- STEP 7. Read the date and time.
--   Dates are day/month/year. The script tries the 12-hour format first
--   ("13/12/2023 2:30:00 PM"), then the 24-hour format ("13/12/2023 14:30:00").
--   A line whose date cannot be read either way is skipped. So is a date with a
--   two-digit year ("13/12/23"), which DuckDB would otherwise read as the year
--   0023: the year must have four digits, which means 1000 or later.
parsed AS (
    SELECT
        try_strptime(trim(d[1]),
            ['%d/%m/%Y %I:%M:%S %p', '%d/%m/%Y %H:%M:%S']) AS ts,
        ln,
        h,
        d
    FROM data_rows
)

-- STEP 8. Build the table of readings.
--   For each row of readings, take the values from the columns chosen in
--   step 4 for its header and tidy them with clean(). The battery reading goes
--   into the voltage or the percent column (step 5); the other one is left
--   blank. Times are written as YYYY-MM-DD HH:MM:SS. The line number is kept so
--   that rows with the same time can stay in the order they have in the file.
SELECT
    p.ln                                                     AS ln,
    strftime(p.ts, '%Y-%m-%d %H:%M:%S')                     AS date_time,
    clean(nth(p.d, ly.rain_col))                             AS rain,
    clean(nth(p.d, ly.rain_valid_col))                       AS rain_valid_pct,
    CASE WHEN ly.battery_kind = 'voltage'
         THEN clean(nth(p.d, ly.battery_col)) ELSE NULL END  AS battery_voltage,
    CASE WHEN ly.battery_kind = 'percent'
         THEN clean(nth(p.d, ly.battery_col)) ELSE NULL END  AS battery_percent,
    clean(nth(p.d, ly.battery_valid_col))                    AS battery_valid_pct
FROM parsed p
JOIN layout2 ly ON ly.h = p.h
WHERE p.ts IS NOT NULL AND year(p.ts) >= 1000;


-- STEP 9. Stop if there is nothing to import.
--   A file with no readings at all (no header was found, or there are no rows
--   below it) fails the run, rather than writing an empty output file and
--   reporting success. The message is the one the Python version fails with,
--   and Climsoft shows it as the run's error. error() ends the script here, so
--   nothing is written; Climsoft removes this run's working tables afterwards.
SELECT CASE WHEN count(*) = 0 THEN error(
           'No data rows found in ' || getvariable('climsoft_input_file_path_name')
           || '. Expected an LSI LASTEM Elab export with a ''Date/time'' header and tab-separated columns.')
       END
FROM arg_rows;


-- STEP 10. Save the output.
--   Rows are sorted earliest first; rows with the same time keep their order in
--   the file. The result is saved as output.csv in the output folder.
COPY (
    SELECT date_time, rain, rain_valid_pct, battery_voltage, battery_percent, battery_valid_pct
    FROM arg_rows
    ORDER BY date_time, ln
)
TO (getvariable('climsoft_output_dir') || '/output.csv') WITH (HEADER, DELIMITER ',');


-- STEP 11. Drop the working table, so its memory is free again for other runs.
DROP TABLE arg_rows;

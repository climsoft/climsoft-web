-- ============================================================================
--  LSI LASTEM X-Log  ->  stacked (long) CSV
--  ----------------------------------------------------------------------------
--  Reads the ASCII record file(s) produced by an X-Log data logger and emits
--  one row per reading:
--
--        station | measurement | date_time | value
--
--  where `measurement` = <raw_id>_<measurement_name>_<process_id>_<process_name>
--        e.g.  1_temperature_3_minimum
--
--  Design notes
--  ------------
--  * Record layout (Appendix 11.1):
--        S <d> ID <d> hh <d> mm <d> ss <d> dd <d> mm <d> yyyy <d> [mid <d> pid <d> value] ... #
--    Header is fields 1..8; the rest are repeating (mid, pid, value) triplets.
--  * Records start with 'S' and normally end with '#', but a record cut short by
--    the logger has no '#', so records are split on the 'S' (see step 1). Line
--    breaks are ignored: a record may be on one line or span several. The field
--    delimiter <d> is either ';' or ',' and can differ from file to file; both
--    are handled (see step 2).
--  * A damaged record is skipped whole, never partly imported (see step 4): once
--    a field is lost or added, every triplet after it is shifted by one and
--    still looks numeric, so skipping only the triplet that failed to parse
--    would import the shifted readings after it.
--  * Problems are written as JSON Lines to the warnings file, with the same
--    types, messages and fields as the Python and JavaScript versions of this
--    adapter, so the run does not fail over one bad record and nothing is
--    dropped without a trace.
--  * The +50 "repeated-measurement" offset (Appendix 11.1) is resolved so the
--    NAME is taken from the base type, while the RAW id is kept as the label
--    prefix so instances stay distinct:
--        51 -> temperature (2nd temp),  101 -> temperature (3rd temp),
--        52 -> humidity   (2nd RH),     108/158 -> battery_voltage.
--    (base_id = ((raw_id - 1) % 50) + 1)
--  * The -9999.0 no-data fill and the '*' validation sentinel both become NULL.
--
--  Run it:   duckdb < transform.sql
--            (or paste into the DuckDB CLI, or duckdb.sql(open('...').read()) )
--  Uncomment and edit the three SET VARIABLE lines at the top: climsoft_input_file_path_name
--  (the input; accepts a glob, e.g. '.../Rwanda/*.txt'), climsoft_output_dir
--  (the folder the output.csv is written to) and climsoft_warnings (the JSON Lines
--  file warnings are written to). The Climsoft runner sets all three itself.
-- ============================================================================


-- SET VARIABLE climsoft_input_file_path_name = 'C:/Users/patoe/Desktop/CLIMSOFT & R-INSTAT/COUNTRIES/Rwanda/000037202606150000.txt';
-- SET VARIABLE climsoft_output_dir = 'C:/Users/patoe/Desktop/CLIMSOFT & R-INSTAT/COUNTRIES/Rwanda';
-- SET VARIABLE climsoft_warnings = 'C:/Users/patoe/Desktop/CLIMSOFT & R-INSTAT/COUNTRIES/Rwanda/warnings.jsonl';

-- Steps 1-4 parse and check every record once into a working table, so the
-- output and the warnings below both read the same result. (The runner gives
-- each run its own schema, so these table names cannot collide between runs.)
CREATE OR REPLACE TABLE xlog_records AS
WITH
-- 1. Split the file into records on 'S', the record-start marker. CR/LF are
--    removed from the whole file first: line breaks carry no meaning in X-Log
--    output (a record may sit on one line, span several, or have a break right
--    after the 'S'), so they are dropped rather than treated as boundaries.
--    'S' is used instead of the '#' terminator because a record cut short by the
--    logger has no '#', and splitting on '#' would glue it onto the next record
--    (e.g. '...,201' + 'S,010182,...' -> '201S'). 'S' is safe to split on as it
--    never occurs inside a record (every other field is numeric or '*').
--    Each piece therefore starts with the field delimiter (';' or ','); anything
--    else (empty strings, stray text before the first record) is dropped.
--    rec_no numbers the pieces in file order (the two unnests are zipped), so the
--    final ORDER BY can keep records that share a timestamp (e.g. one the logger
--    resent) in the order they appear in the file instead of interleaving them.
cleaned AS (
    SELECT filename, rec_no, trim(raw_record) AS rec
    FROM (
        SELECT filename,
               unnest(parts) AS raw_record,
               unnest(generate_series(1, len(parts))) AS rec_no
        FROM (
            SELECT filename,
                   string_split(replace(replace(content, chr(13), ''), chr(10), ''), 'S') AS parts
            FROM read_text(getvariable('climsoft_input_file_path_name'))   -- <== INPUT (glob ok)
        )
    )
),
records_only AS (
    SELECT filename, rec_no, rec
    FROM cleaned
    WHERE regexp_matches(rec, '^[;,]')
),

-- 2. Split each record into a (1-based) list of fields. The field delimiter is
--    either ';' or ',' (it can vary between files), so split on the character
--    class [;,]; this needs no per-file detection and would even tolerate a
--    record that mixed them. Values are numeric (decimals use '.'), so ';' and
--    ',' only ever appear as delimiters, never inside a value.
--    f[1] is the empty string left where the 'S' was split off, so the header
--    keeps its original positions (f[2] = station ... f[8] = year).
--    The record's end is cleaned up before splitting:
--      * complete record (ends in '#'): drop the '#' and the delimiter before it.
--      * truncated record (no '#'): its last field may itself be cut short
--        (e.g. '21.15' cut to '21.1'), so drop everything after the last
--        delimiter; only fields that were followed by a delimiter are trusted.
--        Any incomplete trailing triplet is then dropped by step 5's
--        generate_series, which only steps over whole triplets.
--    `line` is the start of the record as it appeared, for the warnings.
fields AS (
    SELECT filename, rec_no,
           left('S' || rec, 120) AS line,
           ends_with(rec, '#') AS complete,
           regexp_split_to_array(
               rtrim(CASE WHEN ends_with(rec, '#') THEN rtrim(rec, '#')
                          ELSE regexp_replace(rec, '[^;,]*$', '') END, ';,'),
               '[;,]') AS f
    FROM records_only
),

-- 3. Parse the timestamp, or NULL if the header does not describe a real instant.
--    Every part must be a plain unsigned integer, and the date must exist (the
--    try_cast rejects e.g. 30 February). Hour, minute and second are range-checked
--    explicitly because DuckDB accepts '24:00:00' and rolls it over to the next
--    day, which the Python and JavaScript versions reject.
timed AS (
    SELECT *,
        CASE WHEN len(f) >= 8
              AND list_bool_and([regexp_full_match(trim(x), '\d+') for x in f[3:8]])
              AND try_cast(trim(f[3]) AS BIGINT) <= 23
              AND try_cast(trim(f[4]) AS BIGINT) <= 59
              AND try_cast(trim(f[5]) AS BIGINT) <= 59
              AND try_cast(trim(f[8]) AS BIGINT) BETWEEN 1 AND 9999
             THEN try_cast(printf('%04d-%02d-%02d %02d:%02d:%02d',
                      try_cast(trim(f[8]) AS BIGINT),   -- year
                      try_cast(trim(f[7]) AS BIGINT),   -- month
                      try_cast(trim(f[6]) AS BIGINT),   -- day
                      try_cast(trim(f[3]) AS BIGINT),   -- hour
                      try_cast(trim(f[4]) AS BIGINT),   -- minute
                      try_cast(trim(f[5]) AS BIGINT))   -- second
                  AS TIMESTAMP)
        END AS date_time
    FROM fields
)

-- 4. Decide whether the record is usable as a whole. `problem` names the first
--    check it fails (it doubles as the warning type), or is NULL if it passes:
--      MALFORMED_RECORD  fewer than the eight header fields.
--      BAD_TIMESTAMP     the header's date/time is not a real instant.
--      RAGGED_RECORD     a complete record whose body is not whole triplets, so
--                        a field was lost or added somewhere and the triplets
--                        are misaligned. (A truncated record is expected to end
--                        part-way through a triplet, so it is not checked.)
--      BAD_TRIPLET       a measurement or process id that is not an unsigned
--                        integer, the other sign of misaligned triplets.
SELECT
    filename,
    rec_no,
    line,
    complete,
    f,
    f[2] AS station,
    date_time,
    CASE
        WHEN len(f) < 8 THEN 'MALFORMED_RECORD'
        WHEN date_time IS NULL THEN 'BAD_TIMESTAMP'
        WHEN complete AND (len(f) - 8) % 3 <> 0 THEN 'RAGGED_RECORD'
        WHEN NOT coalesce(list_bool_and(
                 [ regexp_full_match(trim(f[i]), '\d+') AND regexp_full_match(trim(f[i + 1]), '\d+')
                   for i in generate_series(9, len(f) - 2, 3) ]), true)
            THEN 'BAD_TRIPLET'
    END AS problem
FROM timed;


-- Steps 5-7 turn the records that passed into one row per reading.
CREATE OR REPLACE TABLE xlog_readings AS
WITH
-- 5. Explode the (measurement id, process id, value) triplets into one row each.
--    Triplets begin at f[9] and step by 3 to the end of the record. Only records
--    that passed step 4 are used, so the ids are known to be integers here.
unnested AS (
    SELECT filename, rec_no, station, date_time,
           unnest([ {'pos': i, 'mid': f[i], 'pid': f[i + 1], 'val': f[i + 2]}
                    for i in generate_series(9, len(f) - 2, 3) ]) AS t
    FROM xlog_records
    WHERE problem IS NULL
),
exploded AS (
    SELECT
        filename,
        rec_no,
        station,
        date_time,
        CAST(t.pos AS INTEGER)       AS field_pos,     -- preserves original sensor order
        CAST(trim(t.mid) AS BIGINT)  AS meas_id_raw,
        CAST(trim(t.pid) AS BIGINT)  AS proc_id,
        t.val                        AS value_raw
    FROM unnested
),

-- 6. Lookup tables. Ids 1-40 and the processes are from the X-Log User Guide,
--    Appendix 11.2. Ids 41-49 are from the NESA Evolution user manual,
--    Appendix B, which continues the same table; id 44 (sunshine duration)
--    appears in every record from station 010182. Appendix B lists 46 and 47
--    only as "n. a." (not assigned), so they are left out: a reading with either
--    id is labelled 'unknown' and warned about.
meas_names(id, name) AS (
    VALUES (1,'Temperature'),(2,'Humidity'),(3,'Global solar radiation'),
    (4,'Wind direction'),(5,'Evaporation'),(6,'Hydrometric Level'),
    (7,'Phreatic Level'),(8,'Battery Voltage'),(9,'Wind speed'),
    (10,'Precipitation'),(11,'Net solar radiation'),(12,'Snow Depth'),
    (13,'Pressure'),(14,'Voltage'),(15,'Evapotranspiration'),(16,'Leaf Soaking'),
    (17,'pH'),(18,'Conductivity'),(19,'Counter'),(20,'Crack Gauge'),
    (21,'Slope Gauge'),(22,'Load Cell'),(23,'Redox'),(24,'Oxygen released'),
    (25,'Turbidity'),(26,'Strain Gauge'),(27,'Linear displacement'),(28,'Frequency'),
    (29,'CH4'),(30,'THC'),(31,'NMHC'),(32,'Current'),(33,'Capacity'),(34,'CO'),
    (35,'NO'),(36,'NOX'),(37,'NO2'),(38,'O3'),(39,'SO2'),(40,'Energy'),
    -- NESA Evolution user manual, Appendix B
    (41,'Auxiliary Measurement'),(42,'Temp. Auxiliary'),(43,'Visibility'),
    (44,'Duration of Sunshine'),(45,'UV'),(48,'Latitude'),(49,'Longitude')
),
proc_names(id, name) AS (
    VALUES (1,'Instant'),(2,'Average'),(3,'Minimum'),(4,'Maximum'),
    (5,'Min Minimum'),(6,'Min Maximum'),(7,'Accumulation'),(8,'Standard Deviation'),
    (9,'Root Mean Square Deviation'),(10,'Delta M1 M2 relative to T1 T2'),
    (11,'Daily Average'),(12,'Daily Minimum'),(13,'Daily Maximum'),
    (14,'Status'),(15,'Status Measurement Value')
),

-- 7. resolve the base measurement id, clean the -9999 / '*' sentinels.
resolved AS (
    SELECT
        filename,
        rec_no,
        station,
        date_time,
        field_pos,
        meas_id_raw,
        proc_id,
        -- Undo the "+50 per repeated instance" offset (App. 11.1) so every instance
        -- of a type collapses back to its base id: 1/51/101 -> 1, 2/52 -> 2, etc.
        -- Why the -1 / +1 around the modulo (and not a bare `meas_id_raw % 50`):
        -- the ids are 1-based, but the offset is added in whole blocks of 50, so the
        -- block boundaries fall on 50, 100, 150... A plain `% 50` maps those to 0 --
        -- e.g. 50 -> 0, which is not a valid measurement id and would mis-key the
        -- join. Subtracting 1 shifts to a 0-based space where the boundaries line up
        -- on 0, taking `% 50` strips the instance count cleanly, and adding 1 back
        -- returns to the valid 1-based range [1..50]. It's the standard idiom for
        -- wrapping a 1-based number without the off-by-one at the wrap point.
        -- (safe because the +50 scheme only works when base ids are <= 50, which the
        --  logger's own encoding guarantees. Any base id not in the lookup
        --  tables is labelled '..._unknown_...' and kept, never dropped.)
        ((meas_id_raw - 1) % 50) + 1 AS base_meas_id,
        -- Missing values: -9999.0 is the logger's no-data fill, and any value that
        -- is not a number becomes NULL through try_cast. For example, the '*'
        -- validation sentinel (seen as '13,2,*' for pressure sensors whose reading
        -- the logger marked invalid) is output as a reading with an empty value.
        -- try_cast does this for every non-numeric value, not only '*'.
        CASE WHEN try_cast(value_raw AS DOUBLE) = -9999.0 THEN NULL
             ELSE try_cast(value_raw AS DOUBLE) END AS value
    FROM exploded
)

-- measurement = "<raw_id>_<measurement_name>_<proc_id>_<process_name>", e.g. "1_temperature_3_minimum".
--   * raw_id (not base) stays in the prefix so repeated instances remain distinct (1/51/101).
--   * names joined from the step 6 lookups; LEFT JOIN + coalesce(...,'unknown') keeps rows
--     even if an id is missing from the tables (label flags it rather than dropping the reading).
--     meas_name / proc_name stay NULL for those, which is what the warnings below key on.
--   * regexp_replace lowercases and collapses non-alphanumerics to '_'; trim(...,'_') removes
--     any leading/trailing underscore (e.g. from a name that ends in punctuation).
SELECT
    r.filename,
    r.rec_no,
    r.field_pos,
    r.station,
    r.date_time,
    r.meas_id_raw,
    r.base_meas_id,
    r.proc_id,
    mn.name AS meas_name,
    pn.name AS proc_name,
    r.meas_id_raw || '_'
      || trim(regexp_replace(lower(coalesce(mn.name, 'unknown')), '[^a-z0-9]+', '_', 'g'), '_')
      || '_' || r.proc_id || '_'
      || trim(regexp_replace(lower(coalesce(pn.name, 'unknown')), '[^a-z0-9]+', '_', 'g'), '_')
      AS measurement,
    r.value
FROM resolved r
LEFT JOIN meas_names mn ON mn.id = r.base_meas_id
LEFT JOIN proc_names pn ON pn.id = r.proc_id;


-- 8. Write the warnings as JSON Lines, in file order, one object per line.
--    This runs before the output is written so that, if step 9 fails the run,
--    the warnings explaining why every record was rejected are still there.
--    COPY has no raw-text format, so each warning is built as a single JSON
--    value and written as a one-column CSV with quoting turned off; JSON
--    escapes its own quotes and control characters, so nothing in it needs CSV
--    quoting. The order (truncation, then the record's problem, then unknown
--    ids by field position) is the order the Python and JavaScript versions
--    report them in.
COPY (
    SELECT warning
    FROM (
        SELECT filename, rec_no, 0 AS seq,
               json_object('type', 'TRUNCATED_RECORD',
                           'message', 'Record has no closing ''#''; its last field and any incomplete trailing triplet were dropped in case they were cut short.',
                           'line', line) AS warning
        FROM xlog_records
        WHERE NOT complete

        UNION ALL
        SELECT filename, rec_no, 1,
               CASE problem
                   WHEN 'MALFORMED_RECORD' THEN json_object('type', problem,
                       'message', 'Record is shorter than the eight-field header; skipped.',
                       'line', line)
                   WHEN 'BAD_TIMESTAMP' THEN json_object('type', problem,
                       'message', 'Unparseable date/time in record; skipped.',
                       'line', line)
                   WHEN 'RAGGED_RECORD' THEN json_object('type', problem,
                       'message', printf('Record body has %d fields, not a multiple of three, so its triplets are misaligned; whole record skipped.', len(f) - 8),
                       'station', station, 'line', line)
                   WHEN 'BAD_TRIPLET' THEN json_object('type', problem,
                       'message', 'Non-numeric measurement or process id, so the record''s triplets are misaligned; whole record skipped.',
                       'station', station, 'line', line)
               END
        FROM xlog_records
        WHERE problem IS NOT NULL

        UNION ALL
        SELECT filename, rec_no, 2 + 2 * field_pos,
               json_object('type', 'UNKNOWN_MEASUREMENT',
                           'message', printf('Measurement id %d (base %d) is not in the id tables; labelled ''unknown''.', meas_id_raw, base_meas_id),
                           'station', station, 'measurement_id', meas_id_raw)
        FROM xlog_readings
        WHERE meas_name IS NULL

        UNION ALL
        SELECT filename, rec_no, 3 + 2 * field_pos,
               json_object('type', 'UNKNOWN_PROCESS',
                           'message', printf('Process id %d is not in the id tables; labelled ''unknown''.', proc_id),
                           'station', station, 'process_id', proc_id)
        FROM xlog_readings
        WHERE proc_name IS NULL
    )
    ORDER BY filename, rec_no, seq
)
TO (getvariable('climsoft_warnings')) WITH (FORMAT CSV, HEADER false, QUOTE '', ESCAPE '', DELIMITER '\t');


-- 9. Fail the run if there is nothing to import, rather than write a header-only
--    output.csv: an empty import reporting success is worse than a failure that
--    names the problem. The message is the one the Python and JavaScript
--    versions fail with, and the runner passes it on as the run's error.
--    error() aborts the script here, so step 10 never writes an output file;
--    the runner drops this run's schema, and with it the working tables, either
--    way.
SELECT CASE WHEN count(*) = 0 THEN error(
           'No X-Log records found in ' || getvariable('climsoft_input_file_path_name')
           || '. Expected lines starting with ''S'' and containing (measurement id ; process id ; value) triplets.')
       END
FROM xlog_readings;


-- 10. Emit the long rows.
-- ORDER BY date_time, then file order (filename, rec_no), then field_pos preserves the original
-- record and in-record sensor order within a timestamp. Without rec_no, two records sharing a
-- timestamp would tie on field_pos and their readings would come out interleaved, in an order
-- that is not guaranteed between runs.
COPY (
    SELECT station, measurement, date_time, value
    FROM xlog_readings
    ORDER BY date_time, filename, rec_no, field_pos   -- add station first if merging many stations
)
TO (getvariable('climsoft_output_dir') || '/output.csv') WITH (HEADER, DELIMITER ',');


-- 11. Drop the working tables as soon as the output is written. They hold the
--     whole file in memory, one row per reading: for a 20 MB file (2.1 million
--     readings) the run peaks at about 1.2 GB. The DuckDB runner is a single
--     long-lived process shared by every SQL adapter, so memory held here is
--     memory every other run is competing for. Dropping the tables at the end
--     of the script frees it as soon as this run no longer needs it.
--     The runner also drops this run's schema, tables included, once the
--     script finishes or fails. So these DROPs are not the only cleanup, but
--     they do not depend on that drop succeeding. (If it fails, for example
--     after an interrupted run, the runner's periodic sweep catches it later.)
--     When the script is run by hand against a database file rather than in
--     memory, the DROPs also stop the tables being saved into that file.
--     If step 9 fails the run, these lines never execute, and the runner's
--     schema drop is the only cleanup.
DROP TABLE xlog_readings;
DROP TABLE xlog_records;

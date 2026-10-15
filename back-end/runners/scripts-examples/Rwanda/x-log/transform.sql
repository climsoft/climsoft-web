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
--  * Records are delimited by '#'. The field delimiter <d> is either ';' or ','
--    and can differ from file to file; both are handled (see step 1). Newlines
--    between records, if present, are incidental and ignored.
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
--  Uncomment and edit the two SET VARIABLE lines at the top: climsoft_input_file_path_name
--  (the input; accepts a glob, e.g. '.../Rwanda/*.txt') and climsoft_output_dir
--  (the folder the output.csv is written to).
-- ============================================================================


-- SET VARIABLE climsoft_input_file_path_name = 'C:/Users/patoe/Desktop/CLIMSOFT & R-INSTAT/COUNTRIES/Rwanda/000037202606150000.txt';
-- SET VARIABLE climsoft_output_dir = 'C:/Users/patoe/Desktop/CLIMSOFT & R-INSTAT/COUNTRIES/Rwanda';

COPY (
WITH
-- 1. Split the file into records on '#' (the record delimiter), then clean each
--    one: strip any CR/LF (newlines between records are incidental) and trim.
--    Keep only real 'S' records; the empty tail after the final '#' drops out.
cleaned AS (
    SELECT trim(replace(replace(raw_record, chr(13), ''), chr(10), '')) AS rec
    FROM (
        SELECT unnest(string_split(content, '#')) AS raw_record
        FROM read_text(getvariable('climsoft_input_file_path_name'))   -- <== INPUT (glob ok)
    )
),
records_only AS (
    SELECT rec
    FROM cleaned
    WHERE rec <> '' AND starts_with(rec, 'S')
),

-- 2. Split each record into a (1-based) list of fields. The field delimiter is
--    either ';' or ',' (it can vary between files), so split on the character
--    class [;,]; this needs no per-file detection and would even tolerate a
--    record that mixed them. rtrim first removes the trailing delimiter that
--    sat before '#'. Values are numeric (decimals use '.'), so ';' and ',' only
--    ever appear as delimiters, never inside a value.
fields AS (
    SELECT regexp_split_to_array(rtrim(rec, ';,'), '[;,]') AS f
    FROM records_only
),

-- 3. pull out the header and build the list of (measurement id, process id, value) triplets.
--    Triplets begin at f[9] and step by 3 to the end of the record.
records AS (
    SELECT
        f[2] AS station,
        make_timestamp(
            CAST(f[8] AS INTEGER),   -- year
            CAST(f[7] AS INTEGER),   -- month
            CAST(f[6] AS INTEGER),   -- day
            CAST(f[3] AS INTEGER),   -- hour
            CAST(f[4] AS INTEGER),   -- minute
            CAST(f[5] AS DOUBLE)     -- second
        ) AS date_time,
        [ {'pos': i, 'mid': f[i], 'pid': f[i + 1], 'val': f[i + 2]}
          for i in generate_series(9, len(f) - 2, 3) ] AS trips
    FROM fields
),

-- 4. explode the triplet list into one row each.
unnested AS (
    SELECT station, date_time, unnest(trips) AS t
    FROM records
),
exploded AS (
    SELECT
        station,
        date_time,
        CAST(t.pos AS INTEGER)  AS field_pos,     -- preserves original sensor order
        CAST(t.mid AS INTEGER)  AS meas_id_raw,
        CAST(t.pid AS INTEGER)  AS proc_id,
        t.val                   AS value_raw
    FROM unnested
),

-- 5. Appendix 11.2 lookup tables.
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
    (35,'NO'),(36,'NOX'),(37,'NO2'),(38,'O3'),(39,'SO2'),(40,'Energy')
),
proc_names(id, name) AS (
    VALUES (1,'Instant'),(2,'Average'),(3,'Minimum'),(4,'Maximum'),
    (5,'Min Minimum'),(6,'Min Maximum'),(7,'Accumulation'),(8,'Standard Deviation'),
    (9,'Root Mean Square Deviation'),(10,'Delta M1 M2 relative to T1 T2'),
    (11,'Daily Average'),(12,'Daily Minimum'),(13,'Daily Maximum'),
    (14,'Status'),(15,'Status Measurement Value')
),

-- 6. resolve the base measurement id, clean the -9999 / '*' sentinels.
resolved AS (
    SELECT
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
        --  logger's own encoding guarantees. Note App. 11.2 defines ids past 40:
        --  e.g. id 44 has been seen in real data. Any base id not in the lookup
        --  table below is labelled '..._unknown_...' and kept, never dropped.)
        ((meas_id_raw - 1) % 50) + 1 AS base_meas_id,
        CASE WHEN try_cast(value_raw AS DOUBLE) = -9999.0 THEN NULL
             ELSE try_cast(value_raw AS DOUBLE) END AS value
    FROM exploded
)

-- 7. Build the label and emit the long rows.
-- measurement = "<raw_id>_<measurement_name>_<proc_id>_<process_name>", e.g. "1_temperature_3_minimum".
--   * raw_id (not base) stays in the prefix so repeated instances remain distinct (1/51/101).
--   * names joined from the App. 11.2 lookups; LEFT JOIN + coalesce(...,'unknown') keeps rows
--     even if an id is missing from the tables (label flags it rather than dropping the reading).
--   * regexp_replace lowercases and collapses non-alphanumerics to '_'; trim(...,'_') removes
--     any leading/trailing underscore (e.g. from a name that ends in punctuation).
-- ORDER BY date_time, field_pos preserves the original in-record sensor order within a timestamp.
SELECT
    r.station,
    r.meas_id_raw || '_'
      || trim(regexp_replace(lower(coalesce(mn.name, 'unknown')), '[^a-z0-9]+', '_', 'g'), '_')
      || '_' || r.proc_id || '_'
      || trim(regexp_replace(lower(coalesce(pn.name, 'unknown')), '[^a-z0-9]+', '_', 'g'), '_')
      AS measurement,
    r.date_time,
    r.value
FROM resolved r
LEFT JOIN meas_names mn ON mn.id = r.base_meas_id
LEFT JOIN proc_names pn ON pn.id = r.proc_id
ORDER BY r.date_time, r.field_pos           -- add r.station first if merging many stations
)
TO (getvariable('climsoft_output_dir') || '/output.csv') WITH (HEADER, DELIMITER ',');

-- Climsoft adapter starter template (SQL / DuckDB).
--
-- Extensions: declare any DuckDB extensions you need in extensions.txt
-- (one per line). The runner installs and loads them before this script runs.
--
-- The runner injects these variables before your script runs:
--   climsoft_input_dir  - directory containing input file(s)
--   climsoft_output_dir - directory where output file(s) must be written
--   climsoft_metadata   - path to a JSON sidecar with context metadata
--   climsoft_warnings   - path to write structured warnings (JSON Lines)
--
-- Access them with: getvariable('climsoft_input_dir')
--
-- Your script must:
--   1. Read from input files in climsoft_input_dir
--   2. Transform the data
--   3. Write the result to a file inside climsoft_output_dir using COPY ... TO
--
-- Example: read every .csv in the input directory, filter rows, write the
-- result back as a single CSV in the output directory.

COPY (
    SELECT *
    FROM read_csv(getvariable('climsoft_input_dir') || '/*.csv', header = true, auto_detect = true)
    WHERE column0 IS NOT NULL
) TO getvariable('climsoft_output_dir') || '/output.csv' (HEADER, DELIMITER ',');

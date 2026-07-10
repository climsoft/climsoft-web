-- Climsoft adapter starter template (SQL / DuckDB).
--
-- Extensions: declare any DuckDB extensions you need in extensions.txt
-- (one per line). The runner installs and loads them before this script runs.
--
-- The runner injects these variables before your script runs:
--   climsoft_input_file_path_name  - input file
--   climsoft_output_dir - directory where output file(s) must be written
--   climsoft_metadata   - path to a JSON sidecar with context metadata
--   climsoft_warnings   - path to write structured warnings (JSON Lines)
--
-- Access them with: getvariable('climsoft_file_path_name')
--
-- Your script must:
--   1. Read from input files in 'climsoft_file_path_name'
--   2. Transform the data
--   3. Write the result to a file inside climsoft_output_dir using COPY ... TO
--
-- Example: read .csv, filter rows, write the
-- result back as a single CSV in the output directory.

COPY (
    SELECT *
    FROM read_csv(getvariable('climsoft_input_file_path_name'), header = true, auto_detect = true)
) TO (getvariable('climsoft_output_dir') || '/output.csv') WITH (HEADER, DELIMITER ',');

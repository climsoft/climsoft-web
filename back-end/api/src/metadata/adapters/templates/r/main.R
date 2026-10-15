##
## Climsoft adapter starter template (R).
##
## Environment variables set by the runner:
##   CLIMSOFT_INPUT_FILE_PATH_NAME    - input file to process
##   CLIMSOFT_OUTPUT_DIR   - directory where the output file(s) must be written
##   CLIMSOFT_METADATA_FILE - path to a JSON sidecar with context metadata
##   CLIMSOFT_WARNINGS_FILE - path to write structured warnings (JSON Lines)
##   CLIMSOFT_SCRIPT_DIR   - folder holding this script and any files uploaded with it
##
## The script runs with its working directory set to the operation's directory,
## so use CLIMSOFT_SCRIPT_DIR to find files that ship alongside it, such as a
## lookup table.
##

input_file    <- Sys.getenv("CLIMSOFT_INPUT_FILE_PATH_NAME")
output_dir    <- Sys.getenv("CLIMSOFT_OUTPUT_DIR")
metadata_file <- Sys.getenv("CLIMSOFT_METADATA_FILE")
warnings_file <- Sys.getenv("CLIMSOFT_WARNINGS_FILE")
# script_dir  <- Sys.getenv("CLIMSOFT_SCRIPT_DIR")

# Read the metadata sidecar for context
metadata <- jsonlite::fromJSON(metadata_file)
cat(sprintf("Processing file: %s\n", metadata$originalFileName))
cat(sprintf("Test run: %s\n", metadata$testRun))

# TODO: Replace this with your actual processing logic.
# This template simply copies the input to the output unchanged.
output_file <- file.path(output_dir, "output.csv")
invisible(file.copy(input_file, output_file, overwrite = TRUE))

cat(sprintf("Done. Output written to %s\n", output_file))

##
## Climsoft adapter starter template (R).
##
## Environment variables set by the runner:
##   CLIMSOFT_INPUT_FILE    - path to the input file to process
##   CLIMSOFT_OUTPUT_FILE   - path where the output file must be written
##   CLIMSOFT_METADATA_FILE - path to a JSON sidecar with context metadata
##   CLIMSOFT_WARNINGS_FILE - path to write structured warnings (JSON Lines)
##

input_file    <- Sys.getenv("CLIMSOFT_INPUT_FILE")
output_file   <- Sys.getenv("CLIMSOFT_OUTPUT_FILE")
metadata_file <- Sys.getenv("CLIMSOFT_METADATA_FILE")
warnings_file <- Sys.getenv("CLIMSOFT_WARNINGS_FILE")

# Read the metadata sidecar for context
metadata <- jsonlite::fromJSON(metadata_file)
cat(sprintf("Processing file: %s\n", metadata$originalFileName))
cat(sprintf("Test run: %s\n", metadata$testRun))

# TODO: Replace this with your actual processing logic.
# This template simply copies the input to the output unchanged.
file.copy(input_file, output_file, overwrite = TRUE)

cat(sprintf("Done. Output written to %s\n", output_file))

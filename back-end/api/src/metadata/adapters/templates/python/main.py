"""
Climsoft adapter starter template (Python).

This script reads the input file, processes it, and writes the output file.
The paths are provided via environment variables set by the runner:

    CLIMSOFT_INPUT_FILE    — path to the input file to process
    CLIMSOFT_OUTPUT_DIR   — path where the output file(s) must be written
    CLIMSOFT_METADATA_FILE — path to a JSON sidecar with context metadata
    CLIMSOFT_WARNINGS_FILE — path to write structured warnings (JSON Lines)

The script must:
    1. Read from CLIMSOFT_INPUT_FILE_PATH_NAME
    2. Process the data
    3. Write the result to CLIMSOFT_OUTPUT_FILE
    4. Exit with code 0 on success, non-zero on failure

Any output to stdout is captured and shown in the test-run pane.
Any output to stderr is captured and shown on failure.
Warnings can be written to CLIMSOFT_WARNINGS_FILE as JSON Lines:
    {"message": "3 rows had blank station codes", "detail": {"rowCount": 3}}
"""

import os
import json
import shutil


def main():
    input_file = os.environ['CLIMSOFT_INPUT_FILE_PATH_NAME']
    output_file = os.environ['CLIMSOFT_OUTPUT_DIR']
    metadata_file = os.environ['CLIMSOFT_METADATA_FILE']
    # warnings_file = os.environ['CLIMSOFT_WARNINGS_FILE']

    # Read the metadata sidecar for context about the run
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)

    print(f"Test run: {metadata.get('testRun', False)}")

    # TODO: Replace this with your actual processing logic.
    # This template simply copies the input to the output unchanged.
    shutil.copyfile(input_file, output_file)

    print(f"Done. Output written to {output_file}")


if __name__ == '__main__':
    main()

/**
 * Climsoft adapter starter template (JavaScript / Node.js).
 *
 * Environment variables set by the runner:
 *   CLIMSOFT_INPUT_FILE    - path to the input file to process
 *   CLIMSOFT_OUTPUT_DIR   - path where the output file(s) must be written
 *   CLIMSOFT_METADATA_FILE - path to a JSON sidecar with context metadata
 *   CLIMSOFT_WARNINGS_FILE - path to write structured warnings (JSON Lines)
 */

const fs = require('fs');

const inputFile = process.env.CLIMSOFT_INPUT_FILE_PATH_NAME;
const outputFile = process.env.CLIMSOFT_OUTPUT_DIR;
const metadataFile = process.env.CLIMSOFT_METADATA_FILE;
// const warningsFile = process.env.CLIMSOFT_WARNINGS_FILE;

// Read the metadata sidecar for context
const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
console.log(`Test run: ${metadata.testRun}`);

// TODO: Replace this with your actual processing logic.
// This template simply copies the input to the output unchanged.
fs.copyFileSync(inputFile, outputFile);

console.log(`Done. Output written to ${outputFile}`);

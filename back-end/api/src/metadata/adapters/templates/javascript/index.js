/**
 * Climsoft adapter starter template (JavaScript / Node.js).
 *
 * Environment variables set by the runner:
 *   CLIMSOFT_INPUT_FILE_PATH_NAME - path to the input file to process
 *   CLIMSOFT_OUTPUT_DIR   - directory where the output file(s) must be written
 *   CLIMSOFT_METADATA_FILE - path to a JSON sidecar with context metadata
 *   CLIMSOFT_WARNINGS_FILE - path to write structured warnings (JSON Lines)
 *   CLIMSOFT_SCRIPT_DIR   - folder holding this script and any files uploaded with it
 *
 * The script runs with its working directory set to the operation's directory,
 * so use CLIMSOFT_SCRIPT_DIR (or __dirname) to find files that ship alongside
 * it, such as a lookup table.
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.env.CLIMSOFT_INPUT_FILE_PATH_NAME;
const outputDir = process.env.CLIMSOFT_OUTPUT_DIR;
const metadataFile = process.env.CLIMSOFT_METADATA_FILE;
// const warningsFile = process.env.CLIMSOFT_WARNINGS_FILE;
// const scriptDir = process.env.CLIMSOFT_SCRIPT_DIR;

// Read the metadata sidecar for context
const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
console.log(`Test run: ${metadata.testRun}`);

// TODO: Replace this with your actual processing logic.
// This template simply copies the input to the output unchanged.
const outputFile = path.join(outputDir, 'output.csv');
fs.copyFileSync(inputFile, outputFile);

console.log(`Done. Output written to ${outputFile}`);

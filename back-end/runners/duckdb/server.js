/**
 * Climsoft DuckDB (SQL) adapter runner.
 *
 * Express wrapper that executes user-supplied SQL scripts against an
 * ephemeral in-memory DuckDB instance. Each run gets a fresh database.
 *
 * Dependencies (DuckDB extensions) are declared in <scriptDir>/extensions.txt,
 * one per line. The runner installs and loads them on the user's behalf
 * before executing the script — keeping the contract symmetric with the
 * Python/R/JavaScript runners. Extension binaries are cached in
 * <scriptDir>/.installed/ across runs.
 *
 * The SQL script accesses paths via DuckDB variables:
 *   getvariable('climsoft_input_file_path_name')  — input directory path
 *   getvariable('climsoft_output_dir') — output directory path
 *   getvariable('climsoft_metadata')   — metadata sidecar path
 *   getvariable('climsoft_warnings')   — warnings file path
 */

const express = require('express');
const { DuckDBInstance } = require('@duckdb/node-api');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const INSTALLED_DIR_NAME = '.installed';
const EXTENSIONS_MANIFEST = 'extensions.txt';
// DuckDB extension names are lowercase alphanumeric + underscore. Validate
// before splicing into INSTALL/LOAD statements to prevent SQL injection from
// a malformed manifest.
const EXTENSION_NAME_RE = /^[a-z0-9_]+$/;

app.get('/health', async (_req, res) => {
  try {
    const instance = await DuckDBInstance.create(':memory:');
    const conn = await instance.connect();
    const result = await conn.run("SELECT version() AS v");
    const rows = result.getRows();
    const version = rows.length > 0 ? String(rows[0][0]) : 'unknown';
    conn.closeSync();
    res.json({ status: 'ok', runtime: 'sql', version });
  } catch (err) {
    res.json({ status: 'ok', runtime: 'sql', version: 'unknown' });
  }
});

app.post('/run', async (req, res) => {
  try {
    console.log('Received run request with body:', req.body);
    const body = req.body;
    const required = ['scriptDir', 'entryPoint', 'inputFilePathName', 'outputDir', 'metadataFile', 'timeoutSeconds'];
    const missing = required.filter(k => !(k in body));
    if (missing.length > 0) {
      return res.json(errorSummary('RUNTIME_ERROR', `Missing required fields: ${missing.join(', ')}`));
    }

    const { scriptDir, entryPoint, inputFilePathName, outputDir, metadataFile, timeoutSeconds } = body;

    // Derive log paths by convention
    const warningsFile = path.join(outputDir, 'warnings.jsonl');
    const stdoutFile = path.join(outputDir, 'stdout.log');
    const stderrFile = path.join(outputDir, 'stderr.log');
    const installLogFile = path.join(outputDir, 'install.log');

    const entryPath = path.join(scriptDir, entryPoint);
    console.log(`Validating entry point at '${entryPath}'`);
    if (!fs.existsSync(entryPath)) {
      return res.json(errorSummary('RUNTIME_ERROR', `Entry point not found: ${entryPath}`));
    }

    console.log(`Entry point '${entryPoint}' exists. Validating it's a file.`);

    // Read the user's SQL
    const userSql = fs.readFileSync(entryPath, 'utf8');

    // Parse the extensions manifest (one extension name per line, # comments allowed)
    const extensions = readExtensionsManifest(scriptDir);
    const invalidName = extensions.find(e => !EXTENSION_NAME_RE.test(e));
    if (invalidName) {
      return res.json(errorSummary(
        'INSTALL_FAILED',
        `Invalid extension name '${invalidName}' in ${EXTENSIONS_MANIFEST}; allowed characters are a-z, 0-9, _`,
      ));
    }

    const start = Date.now();

    let conn;
    try {
      const instance = await DuckDBInstance.create(':memory:');
      conn = await instance.connect();
      console.log(`DuckDB in-memory instance created. Installing/loading extensions: ${extensions.join(', ')}`);

      // Step 1: install + load extensions declared in the manifest.
      // Cache binaries under <scriptDir>/.installed/ so they survive across runs.
      const installLog = await installAndLoadExtensions(conn, scriptDir, extensions);
      fs.writeFileSync(installLogFile, installLog);
      console.log(`Extensions installed/loaded. Log written to ${installLogFile}`);

      // Step 2: inject the path variables the SQL script reads via getvariable().
      await conn.run(`SET VARIABLE climsoft_input_file_path_name = '${inputFilePathName.replace(/'/g, "''")}';`);
      await conn.run(`SET VARIABLE climsoft_output_dir = '${outputDir.replace(/'/g, "''")}';`);
      await conn.run(`SET VARIABLE climsoft_metadata = '${metadataFile.replace(/'/g, "''")}';`);
      await conn.run(`SET VARIABLE climsoft_warnings = '${warningsFile.replace(/'/g, "''")}';`);

      console.log(`Set climsoft_input_file_path_name = '${inputFilePathName}'`);
      console.log(`Set climsoft_output_dir = '${outputDir}'`);
      console.log(`Set climsoft_metadata = '${metadataFile}'`);
      console.log(`Set climsoft_warnings = '${warningsFile}'`);

      // Step 3: per-statement timeout so a runaway query doesn't hang the runner.
      //await conn.run(`SET statement_timeout = '${timeoutSeconds}s';`);

      // Step 4: execute the user's SQL.
      console.log('Executing user SQL:\n', userSql);
      await conn.run(userSql);

      conn.closeSync();
    } catch (err) {
      if (conn) {
        try { conn.closeSync(); } catch { /* ignore */ }
      }
      const durationMs = Date.now() - start;
      const stderr = err.message || String(err);
      fs.writeFileSync(stdoutFile, '');
      fs.writeFileSync(stderrFile, stderr);

      const isTimeout = /timeout/i.test(stderr) || /interrupt/i.test(stderr);
      if (isTimeout) {
        return res.json({
          status: 'timeout',
          durationMs,
          exitCode: 124,
          errorType: 'TIMEOUT',
          errorMessage: `SQL execution exceeded timeout of ${timeoutSeconds}s`,
        });
      }

      // Distinguish install/load errors from user-SQL errors based on the message.
      const errorType = /^(Failed to install|Failed to load) extension/i.test(stderr)
        ? 'INSTALL_FAILED'
        : 'RUNTIME_ERROR';

      return res.json({
        status: 'failure', durationMs, exitCode: 1,
        errorType,
        errorMessage: `SQL execution error: ${stderr}`,
      });
    }

    const durationMs = Date.now() - start;
    fs.writeFileSync(stdoutFile, '');
    fs.writeFileSync(stderrFile, '');

    return res.json({
      status: 'success', durationMs, exitCode: 0,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json(
      errorSummary('RUNTIME_ERROR', `Unexpected runner error: ${err.message}`),
    );
  }
});

/**
 * Reads <scriptDir>/extensions.txt and returns a list of extension names.
 * Blank lines and lines starting with '#' are skipped. Returns an empty
 * array if the file doesn't exist.
 */
function readExtensionsManifest(scriptDir) {
  const manifestPath = path.join(scriptDir, EXTENSIONS_MANIFEST);
  if (!fs.existsSync(manifestPath)) return [];

  const content = fs.readFileSync(manifestPath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

/**
 * Installs and loads the given DuckDB extensions on the connection.
 *
 * Caching: extension binaries are stored under <scriptDir>/.installed/
 * (set as DuckDB's `extension_directory`). On the first run INSTALL
 * downloads each binary; on every subsequent run INSTALL detects the
 * file already exists and is a no-op. LOAD must still be called every
 * time because each request uses a fresh `:memory:` process — but LOAD
 * is just a dlopen of the cached file and is fast.
 *
 * DuckDB version coupling: extensions are compiled against a specific
 * DuckDB version. If `@duckdb/node-api` is upgraded in this runner's
 * package.json (and the image rebuilt), DuckDB will detect the version
 * mismatch on the next INSTALL and transparently re-download. So the
 * cache is correct across upgrades — just slower on the first run after
 * an upgrade. No manual cache invalidation is required.
 *
 * Throws on the first failure; the error message is prefixed so the
 * caller can distinguish install errors from user-SQL errors.
 */
async function installAndLoadExtensions(conn, scriptDir, extensions) {
  const installedDir = path.join(scriptDir, INSTALLED_DIR_NAME);
  const lines = [];

  if (extensions.length === 0) {
    lines.push('No extensions declared in extensions.txt. Skipping install.');
    return lines.join('\n') + '\n';
  }

  fs.mkdirSync(installedDir, { recursive: true });
  await conn.run(`SET extension_directory = '${installedDir.replace(/'/g, "''")}';`);
  lines.push(`Using extension directory: ${installedDir}`);

  for (const ext of extensions) {
    try {
      lines.push(`INSTALL ${ext};`);
      await conn.run(`INSTALL ${ext};`);
    } catch (err) {
      throw new Error(`Failed to install extension '${ext}': ${err.message || err}`);
    }
    try {
      lines.push(`LOAD ${ext};`);
      await conn.run(`LOAD ${ext};`);
    } catch (err) {
      throw new Error(`Failed to load extension '${ext}': ${err.message || err}`);
    }
  }

  return lines.join('\n') + '\n';
}

function errorSummary(errorType, message) {
  return {
    status: 'failure', durationMs: 0, exitCode: -1,
    errorType, errorMessage: message,
  };
}

const port = parseInt(process.env.DUCKDB_RUNNER_PORT || '5104', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`DuckDB adapter runner listening on port ${port}`);
});

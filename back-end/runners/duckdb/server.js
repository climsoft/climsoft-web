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
// Entry point is a language convention (`transform.sql`) enforced by the API
// at upload-preview time — hardcoded here so it doesn't need to travel in the
// request body.
const ENTRY_POINT = 'transform.sql';
// Volume mount points inside this container. Hardcoded to match every
// docker-compose profile (dev / test / prod). Callers pass only IDs.
const ADAPTERS_ROOT = '/app/adapters';
const OPERATIONS_ROOT = '/app/operations';
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
    if (!body) {
      return res.json(errorSummary('RUNTIME_ERROR', 'Request body must be JSON'));
    }
    const required = ['scriptDirName', 'operationId', 'inputRelPath', 'outputRelPath', 'timeoutSeconds'];
    const missing = required.filter(k => !(k in body));
    if (missing.length > 0) {
      console.error(`Missing required fields: ${missing.join(', ')}`);
      return res.json(errorSummary('RUNTIME_ERROR', `Missing required fields: ${missing.join(', ')}`));
    }

    const { scriptDirName, operationId, inputRelPath, outputRelPath, timeoutSeconds } = body;

    // Resolve full paths from the hardcoded roots + wire-supplied IDs.
    const scriptDir = path.join(ADAPTERS_ROOT, scriptDirName);
    const opDir = path.join(OPERATIONS_ROOT, operationId);
    const inputFilePathName = path.join(opDir, inputRelPath);
    const outputDir = path.join(opDir, outputRelPath);

    // Derive log paths by convention inside outputDir.
    const metadataFile = path.join(outputDir, 'metadata.json');
    const warningsFile = path.join(outputDir, 'warnings.jsonl');
    const stdoutFile = path.join(outputDir, 'stdout.log');
    const stderrFile = path.join(outputDir, 'stderr.log');
    const installLogFile = path.join(outputDir, 'install.log');

    const entryPath = path.join(scriptDir, ENTRY_POINT);
    if (!fs.existsSync(entryPath)) {
      console.error(`Entry point not found: ${entryPath}`);
      return res.json(errorSummary('RUNTIME_ERROR', `Entry point not found: ${entryPath}`));
    }

    // Read the user's SQL
    const userSql = fs.readFileSync(entryPath, 'utf8');

    // Parse the extensions manifest (one extension name per line, # comments allowed)
    const extensions = readExtensionsManifest(scriptDir);
    const invalidName = extensions.find(e => !EXTENSION_NAME_RE.test(e));
    if (invalidName) {
      console.error(`Invalid extension name '${invalidName}' in ${EXTENSIONS_MANIFEST}`);
      return res.json(errorSummary(
        'INSTALL_FAILED',
        `Invalid extension name '${invalidName}' in ${EXTENSIONS_MANIFEST}; allowed characters are a-z, 0-9, _`,
      ));
    }

    const start = Date.now();

    let conn;
    let timedOut = false;
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

      // Step 3: enforce a per-run wall-clock timeout. DuckDB has no SQL-level
      // `statement_timeout`, so we drive it from JavaScript: a setTimeout fires
      // `conn.interrupt()` which signals the running query to cancel at its
      // next safe point. The cancellation surfaces as a thrown error that the
      // outer catch below translates into a TIMEOUT response via the
      // `timedOut` flag. Only the user SQL is bounded here — extension
      // install/load runs on its own budget (large first-time downloads must
      // not race this wall clock).
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        console.warn(`Query exceeded timeout of ${timeoutSeconds}s — interrupting.`);
        try {
          conn.interrupt();
        } catch (interruptErr) {
          console.error('conn.interrupt() failed:', interruptErr);
        }
      }, timeoutSeconds * 1000);

      // Step 4: execute the user's SQL.
      try {
        console.log('Executing user SQL:\n', userSql);
        await conn.run(userSql);
      } finally {
        clearTimeout(timeoutHandle);
      }

      conn.closeSync();
    } catch (err) {
      console.error('SQL execution error:', err);
      if (conn) {
        try { conn.closeSync(); } catch { /* ignore */ }
      }
      const durationMs = Date.now() - start;
      const stderr = err.message || String(err);
      fs.writeFileSync(stdoutFile, '');
      fs.writeFileSync(stderrFile, stderr);

      if (timedOut) {
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

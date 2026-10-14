/**
 * Climsoft DuckDB (SQL) adapter runner.
 *
 * Express wrapper that executes user-supplied SQL scripts against a single
 * long-lived in-memory DuckDB instance, shared by every request.
 *
 * ISOLATION IS SOFT. This is not a sandbox, and must not be relied on as one.
 * Each run gets its own schema and its own connection, which keeps scripts from
 * colliding with each other's tables in normal use. It does NOT contain a
 * script that is actively trying to escape: a script can set its own
 * `search_path`, address another schema by name (`main.foo`), or change
 * instance-wide settings. Adapters are sysadmin-supplied code and are trusted
 * accordingly; treat this as hygiene between cooperating scripts, not as a
 * security boundary.
 *
 * Why one shared instance rather than one per request:
 *
 *   - A `:memory:` instance cannot be closed safely on the request path.
 *     `instance.closeSync()` has been tried twice under real concurrent load
 *     and broke the runner both times — once a segfault (`malloc(): mismatching
 *     next->prev_size`, exit 139), once a deadlock (container up, CPU 0%,
 *     /health never answering). `close_sync` is synchronous and a DuckDB
 *     instance owns background threads, so blocking the main thread until they
 *     join, while other requests still have work on the libuv threadpool, is a
 *     plausible way to wedge the loop against itself.
 *   - Leaving the per-request instance unclosed leaks: the binding does
 *     register a GC finalizer, so it is lazy reclamation rather than unbounded
 *     growth, but V8 sizes its heap from the tiny JS wrapper and not the tens
 *     of MB of native memory behind it, so it collects late and in big pauses.
 *     Those pauses stall the event loop past the per-run timeout below, the
 *     interrupt never fires, and the CALLER's HTTP deadline trips instead.
 *
 *     Measured over 1000 requests:
 *         instance per request   RSS  54 MB -> 507 MB, sawtoothing
 *         one shared instance    RSS  71 MB -> 160 MB, flat from ~200 on
 *
 *   - Creating an instance costs ~30 ms; a connection costs ~0.16 ms.
 *
 * A connection alone is NOT an isolation boundary — the catalog belongs to the
 * instance, so four concurrent runs of the same script collide on table names
 * (measured: 25 ok / 75 failed, catalog write-write conflicts). The per-run
 * schema is what makes the shared instance safe (measured: 100 ok / 0 failed).
 *
 * Dependencies (DuckDB extensions) are declared in <scriptDir>/extensions.txt,
 * one per line, and their binaries are cached in <scriptDir>/.installed/ so an
 * adapter owns its dependencies and the existing adapter-directory cleanup
 * reclaims them with it. Installing is per adapter; loading is instance-wide,
 * so adapters share one extension namespace — see ensureExtensions.
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
const crypto = require('crypto');

const app = express();
app.use(express.json());

const EXTENSIONS_MANIFEST = 'extensions.txt';
// Entry point is a language convention (`transform.sql`) enforced by the API
// at upload-preview time — hardcoded here so it doesn't need to travel in the
// request body.
const ENTRY_POINT = 'transform.sql';
// Volume mount points inside this container. Hardcoded to match every
// docker-compose profile (dev / test / prod). Callers pass only IDs.
const ADAPTERS_ROOT = '/app/adapters';
const OPERATIONS_ROOT = '/app/operations';
// Extension binaries are cached inside the adapter that declared them,
// <scriptDir>/.installed/, so an adapter owns its dependencies.
//
// This is deliberately per-adapter rather than one cache for the runner. A
// shared directory under ADAPTERS_ROOT would be deleted out from under us:
// CleanupSchedulerService.cleanupAdapterScriptDirs sweeps every directory there
// that is not a referenced adapter script dir, and a shared cache can never be
// one. Keeping the binaries inside the adapter means the existing sweep
// reclaims them with their adapter, and nothing has to know about them.
const INSTALLED_DIR_NAME = '.installed';
// DuckDB extension names are lowercase alphanumeric + underscore. Validate
// before splicing into INSTALL/LOAD statements to prevent SQL injection from
// a malformed manifest.
const EXTENSION_NAME_RE = /^[a-z0-9_]+$/;
// How often orphaned run schemas are swept. See sweepOrphanSchemas.
const SCHEMA_SWEEP_INTERVAL_MS = 60_000;

// ── Shared instance ───────────────────────────────────────────────────────

/** The one DuckDB instance. Created on first use, never closed. */
let sharedInstancePromise = null;

function getInstance() {
  if (!sharedInstancePromise) {
    sharedInstancePromise = (async () => {
      const instance = await DuckDBInstance.create(':memory:');
      console.log('DuckDB shared instance ready.');
      return instance;
    })().catch((err) => {
      // Don't cache a failed bootstrap — let the next request retry it.
      sharedInstancePromise = null;
      throw err;
    });
  }
  return sharedInstancePromise;
}

// ── Extensions ────────────────────────────────────────────────────────────

/**
 * Extension names LOADed on the shared instance. Loading is instance-wide, so
 * this is keyed on the name alone: once any adapter loads an extension, every
 * adapter has it.
 */
const loadedExtensions = new Set();
/**
 * `<scriptDir>::<extension>` pairs whose binary is present in that adapter's
 * own .installed/ directory. Keyed per adapter, unlike the set above, because
 * installing is what gives each adapter its own tracked copy — two adapters
 * declaring the same extension each get one, so deleting either cannot strip a
 * dependency the other still needs.
 */
const installedFor = new Set();

/**
 * Serialises the install path. `extension_directory` is an INSTANCE-WIDE
 * setting — measured: set it on one connection and another connection reads it
 * back — so pointing it at one adapter's folder is a global mutation. Without
 * this lock, two concurrent first-requests for different adapters could
 * interleave such that A sets its directory, B overwrites it, and A's INSTALL
 * writes the binary into B's folder.
 *
 * Serialising costs nothing because this path is rare: an extension is
 * installed and loaded the first time it is needed and never again for the life
 * of the process. The steady-state request path never takes this lock and never
 * touches the setting.
 */
let installChain = Promise.resolve();
function withInstallLock(fn) {
  const result = installChain.then(fn);
  // Swallowed so one failed install cannot poison the chain for everyone after.
  installChain = result.catch(() => { });
  return result;
}

/**
 * Make sure every extension an adapter declares is installed in that adapter's
 * own directory and loaded on the shared instance.
 *
 * Deliberately lazy and per-request rather than done once at startup: an
 * adapter can be uploaded at any time and must run without a restart, so the
 * runner cannot know at boot which extensions it will ever need. What is done
 * once is the WORK — after the first request that needs a given extension,
 * every later request finds both caches populated and does no filesystem or
 * DuckDB work at all. Measured, the whole per-request filesystem cost of a run
 * is ~0.19% of it, and none of that is extension handling.
 *
 * Install and load are tracked separately because they have different scopes:
 *
 *   INSTALL  per adapter  — the binary lands in <scriptDir>/.installed/, which
 *                           is what makes dependencies trackable and lets the
 *                           existing adapter-directory cleanup reclaim them.
 *   LOAD     per instance — unavoidably shared. All adapters therefore share
 *                           one extension namespace; that is the trade the
 *                           shared instance makes, and it holds because
 *                           adapters are sysadmin-supplied and expected not to
 *                           demand conflicting extensions.
 *
 * So a second adapter declaring an already-loaded extension still installs its
 * own copy but skips the load.
 *
 * Runs on its own time budget, outside the per-run timeout — a large first-time
 * download must not be charged to the script's wall clock.
 */
async function ensureExtensions(scriptDir, extensions) {
  const lines = [];

  if (extensions.length === 0) {
    lines.push('No extensions declared in extensions.txt. Skipping install.');
    return lines.join('\n') + '\n';
  }

  const installedDir = path.join(scriptDir, INSTALLED_DIR_NAME);
  lines.push(`Using extension directory: ${installedDir}`);

  for (const ext of extensions) {
    const installKey = `${scriptDir}::${ext}`;

    // Fast path, taken by every request after the first: no lock, no syscall.
    if (installedFor.has(installKey) && loadedExtensions.has(ext)) {
      lines.push(`${ext}: already installed for this adapter and loaded; skipped.`);
      continue;
    }

    const done = await withInstallLock(async () => {
      // Re-checked inside the lock: another request may have done this while
      // we were queued behind it.
      const needInstall = !installedFor.has(installKey);
      const needLoad = !loadedExtensions.has(ext);
      if (!needInstall && !needLoad) {
        return 'skipped (done while waiting)';
      }

      const instance = await getInstance();
      const conn = await instance.connect();
      try {
        // Set for EITHER path, not just install. LOAD resolves the binary
        // through this same setting — verified: with it pointing at an empty
        // directory, `LOAD httpfs` fails with
        //   IO Error: Extension "<dir>/v1.4.4/linux_amd64/httpfs.duckdb_extension" not found
        // and succeeds as soon as it points at the directory holding the file.
        //
        // The case that needs it is `needLoad && !needInstall`: a previous
        // request installed the binary for this adapter and then failed to load
        // it, so the retry has an install to skip but a load to do. Setting this
        // only under `needInstall` would leave that retry loading against
        // whatever directory the instance was last pointed at — another
        // adapter's folder, or DuckDB's default — which either fails confusingly
        // or silently loads a different adapter's copy.
        await conn.run(`SET extension_directory = '${sqlLiteral(installedDir)}';`);

        if (needInstall) {
          // Install-only: a load needs no directory created, because the binary
          // it is about to read is already sitting in one.
          fs.mkdirSync(installedDir, { recursive: true });
          try {
            await conn.run(`INSTALL ${ext};`);
          } catch (err) {
            throw new Error(`Failed to install extension '${ext}': ${err.message || err}`);
          }
          // Added only on success, so a failure is retried by the next request.
          installedFor.add(installKey);
        }

        if (needLoad) {
          try {
            await conn.run(`LOAD ${ext};`);
          } catch (err) {
            throw new Error(`Failed to load extension '${ext}': ${err.message || err}`);
          }
          loadedExtensions.add(ext);
        }

        return `INSTALL ${needInstall ? 'yes' : 'cached'}; LOAD ${needLoad ? 'yes' : 'already loaded'}`;
      } finally {
        conn.closeSync();
      }
    });

    lines.push(`${ext}: ${done}`);
  }

  return lines.join('\n') + '\n';
}

// ── Per-run schema ────────────────────────────────────────────────────────

/** Schemas belonging to runs currently in flight — the sweeper leaves these alone. */
const activeSchemas = new Set();

/**
 * Drop run schemas that no in-flight request owns.
 *
 * A run normally drops its own schema in its `finally`. That can fail — most
 * plausibly after a timed-out script was interrupted mid-statement — and a
 * schema left behind would sit in the shared instance holding its tables'
 * memory for the life of the process. This is the backstop, not the primary
 * path: anything matching the run-schema prefix that no live request claims is
 * debris by definition, because the name is generated per request and never
 * reused.
 */
async function sweepOrphanSchemas() {
  if (!sharedInstancePromise) {
    return;
  }

  let conn;
  try {
    const instance = await getInstance();
    conn = await instance.connect();
    const result = await conn.runAndReadAll(
      `SELECT schema_name FROM duckdb_schemas() WHERE schema_name LIKE 'run\\_%' ESCAPE '\\'`,
    );

    for (const row of result.getRows()) {
      const name = String(row[0]);
      if (activeSchemas.has(name)) {
        continue;
      }
      try {
        await conn.run(`DROP SCHEMA IF EXISTS "${name}" CASCADE;`);
        console.warn(`Swept orphaned run schema ${name} (its run did not clean up).`);
      } catch (err) {
        console.error(`Could not sweep schema ${name}:`, err.message || err);
      }
    }
  } catch (err) {
    console.error('Orphan schema sweep failed:', err.message || err);
  } finally {
    if (conn) {
      try { conn.closeSync(); } catch { /* ignore */ }
    }
  }
}

const sweepTimer = setInterval(() => { sweepOrphanSchemas(); }, SCHEMA_SWEEP_INTERVAL_MS);
// Don't hold the process open just for the sweeper.
sweepTimer.unref();

// ── Helpers ───────────────────────────────────────────────────────────────

/** Escape a value for use inside a single-quoted SQL literal. */
function sqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

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
 * Close a run's connection. Never throws: teardown failure must not mask the
 * result, or the error, that the caller is about to be sent.
 *
 * Only the connection is closed. The instance is shared and outlives every
 * request — see the file header for why it is never closed at all.
 */
function closeQuietly(conn) {
  if (conn) {
    try { conn.closeSync(); } catch (err) { console.error('conn.closeSync() failed:', err); }
  }
}

function errorSummary(errorType, message) {
  return {
    status: 'failure', durationMs: 0, exitCode: -1,
    errorType, errorMessage: message,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  let conn;
  try {
    const instance = await getInstance();
    conn = await instance.connect();
    const result = await conn.runAndReadAll('SELECT version() AS v');
    const rows = result.getRows();
    const version = rows.length > 0 ? String(rows[0][0]) : 'unknown';
    res.json({ status: 'ok', runtime: 'sql', version });
  } catch (err) {
    res.json({ status: 'ok', runtime: 'sql', version: 'unknown' });
  } finally {
    closeQuietly(conn);
  }
});

app.post('/run', async (req, res) => {
  try {
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
    // Unique per request and never reused, which is what lets the sweeper treat
    // any unclaimed run schema as debris.
    const schema = `run_${crypto.randomUUID().replace(/-/g, '')}`;
    let schemaCreated = false;

    try {
      // Step 1: install + load the adapter's extensions, if this is the first
      // request that has ever needed them. Outside the per-run timeout.
      const installLog = await ensureExtensions(scriptDir, extensions);
      fs.writeFileSync(installLogFile, installLog);

      const instance = await getInstance();
      conn = await instance.connect();

      // Step 2: give this run its own schema. The connection alone does not
      // isolate anything — the catalog belongs to the instance — so without
      // this, concurrent runs of the same script collide on table names.
      // `search_path` is per-connection, so each run's unqualified CREATE lands
      // in its own schema without affecting anyone else's.
      await conn.run(`CREATE SCHEMA "${schema}";`);
      schemaCreated = true;
      activeSchemas.add(schema);
      await conn.run(`SET search_path = '${sqlLiteral(schema)}';`);

      // Step 3: inject the path variables the SQL script reads via getvariable().
      // Variables are per-connection, so these cannot leak between runs.
      await conn.run(`SET VARIABLE climsoft_input_file_path_name = '${sqlLiteral(inputFilePathName)}';`);
      await conn.run(`SET VARIABLE climsoft_output_dir = '${sqlLiteral(outputDir)}';`);
      await conn.run(`SET VARIABLE climsoft_metadata = '${sqlLiteral(metadataFile)}';`);
      await conn.run(`SET VARIABLE climsoft_warnings = '${sqlLiteral(warningsFile)}';`);

      // Step 4: enforce a per-run wall-clock timeout. DuckDB has no SQL-level
      // `statement_timeout`, so we drive it from JavaScript: a setTimeout fires
      // `conn.interrupt()` which signals the running query to cancel at its
      // next safe point. The cancellation surfaces as a thrown error that the
      // outer catch below translates into a TIMEOUT response via the
      // `timedOut` flag. Only the user SQL is bounded here — extension
      // install/load ran on its own budget above.
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        console.warn(`Query exceeded timeout of ${timeoutSeconds}s — interrupting.`);
        try {
          conn.interrupt();
        } catch (interruptErr) {
          console.error('conn.interrupt() failed:', interruptErr);
        }
      }, timeoutSeconds * 1000);

      // Step 5: execute the user's SQL.
      try {
        await conn.run(userSql);
      } finally {
        clearTimeout(timeoutHandle);
      }
    } catch (err) {
      console.error('SQL execution error:', err);
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
    } finally {
      // Drop the run's schema before releasing the connection. Best effort: an
      // interrupted script can leave this failing, and the periodic sweep is
      // what catches that rather than failing the request over cleanup.
      if (schemaCreated && conn) {
        try {
          await conn.run(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
        } catch (cleanupErr) {
          console.error(`Could not drop run schema ${schema}; leaving it for the sweep:`, cleanupErr.message || cleanupErr);
        }
      }
      // Removed from the active set only after the drop is attempted, so the
      // sweeper can never race a live run.
      activeSchemas.delete(schema);
      closeQuietly(conn);
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

const port = parseInt(process.env.DUCKDB_RUNNER_PORT || '5104', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`DuckDB adapter runner listening on port ${port}`);
});

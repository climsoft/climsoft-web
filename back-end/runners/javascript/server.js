/**
 * Climsoft JavaScript adapter runner.
 *
 * Express wrapper that executes user-supplied JavaScript adapter scripts.
 * Dependencies are installed into <scriptDir>/.installed/ on first run.
 * Log files are written to outputDir by convention.
 *
 * A run is one OS process, and that is deliberate — unlike the DuckDB runner,
 * which shares one long-lived engine, this runner cannot amortise anything
 * across runs without giving up the three jobs the process is doing at once:
 * isolating one adapter's module state from another's, giving the timeout
 * something it can actually kill, and containing a crash. What IS amortised is
 * the per-adapter node_modules, below.
 *
 * The script's working directory is the OPERATION directory, not the adapter
 * directory. Two concurrent runs of one adapter would otherwise share a working
 * directory, so anything written relative to `cwd` would collide; and stray
 * relative writes would accumulate in the adapter directory, which is meant to
 * hold code and is only reclaimed when the adapter itself is deleted. Sibling
 * requires are unaffected (`require('./x')` resolves against the file, not the
 * cwd), and a script that needs to read a file shipped beside it has
 * CLIMSOFT_SCRIPT_DIR.
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const INSTALLED_DIR_NAME = '.installed';
// Entry point is a language convention (`index.js`) enforced by the API at
// upload-preview time — hardcoded here so it doesn't need to travel in the
// request body.
const ENTRY_POINT = 'index.js';
// Volume mount points inside this container. Hardcoded to match every
// docker-compose profile (dev / test / prod). Callers pass only IDs.
const ADAPTERS_ROOT = '/app/adapters';
const OPERATIONS_ROOT = '/app/operations';
// Written INSIDE .installed/ only after npm exits 0, and holds a fingerprint of
// what was installed. Its presence is the "these node_modules are usable"
// signal; the directory existing is not, because a crashed npm install leaves
// the directory behind.
const INSTALL_MARKER_NAME = '.climsoft-install-ok';
// How long a timed-out process group gets to exit on SIGTERM before SIGKILL.
const KILL_GRACE_MS = 5000;

// ── Install serialisation ─────────────────────────────────────────────────

/**
 * One promise chain per adapter, so two concurrent first-requests for the same
 * adapter cannot both run `npm install` into the same directory and interleave
 * into a broken tree. Different adapters still install concurrently — unlike the
 * DuckDB runner, which has to serialise globally because `extension_directory`
 * is an instance-wide setting; here there is no shared state to protect.
 *
 * In-process, which is enough because this runner is a single Node process. If
 * it is ever run with a cluster or several replicas over the same volume, this
 * has to become a file lock (the Python runner already uses flock for exactly
 * that reason).
 */
const installChains = new Map();
function withInstallLock(key, fn) {
  const previous = installChains.get(key) || Promise.resolve();
  const result = previous.then(fn);
  // Swallowed so one failed install cannot poison the chain for everyone after.
  installChains.set(key, result.catch(() => { }));
  return result;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', runtime: 'javascript', version: process.version });
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
      return res.json(errorSummary('RUNTIME_ERROR', `Missing required fields: ${missing.join(', ')}`));
    }

    const { scriptDirName, operationId, inputRelPath, outputRelPath, timeoutSeconds } = body;

    // Resolve full paths from the hardcoded roots + wire-supplied IDs.
    const scriptDir = path.join(ADAPTERS_ROOT, scriptDirName);
    const opDir = path.join(OPERATIONS_ROOT, operationId);
    const inputFilePathName = path.join(opDir, inputRelPath);
    const outputDir = path.join(opDir, outputRelPath);

    // Derive paths by convention inside outputDir.
    const envDir = path.join(scriptDir, INSTALLED_DIR_NAME);
    const metadataFile = path.join(outputDir, 'metadata.json');
    const warningsFile = path.join(outputDir, 'warnings.jsonl');
    const stdoutFile = path.join(outputDir, 'stdout.log');
    const stderrFile = path.join(outputDir, 'stderr.log');
    const installLogFile = path.join(outputDir, 'install.log');

    const entryPath = path.join(scriptDir, ENTRY_POINT);
    if (!fs.existsSync(entryPath)) {
      // TODO. Return the correct http status code?
      return res.json(errorSummary('RUNTIME_ERROR', `Entry point not found: ${entryPath}`));
    }

    // Step 1: make sure .installed/ holds this adapter's current dependencies.
    // Does nothing after the first run, or after a run that follows an edit to
    // package.json.
    const install = await ensureDependencies(scriptDir, envDir, installLogFile, timeoutSeconds);
    if (!install.ok) {
      return res.json({
        status: 'failure', durationMs: 0, exitCode: install.exitCode ?? -1,
        errorType: 'INSTALL_FAILED',
        errorMessage: install.error,
      });
    }

    // Step 2: run the script
    const env = {
      ...process.env,
      CLIMSOFT_INPUT_FILE_PATH_NAME: inputFilePathName,
      CLIMSOFT_OUTPUT_DIR: outputDir,
      CLIMSOFT_METADATA_FILE: metadataFile,
      CLIMSOFT_WARNINGS_FILE: warningsFile,
      CLIMSOFT_SCRIPT_DIR: scriptDir,
      CLIMSOFT_RUNNER: 'javascript',
      NODE_PATH: path.join(envDir, 'node_modules'),
    };

    const start = Date.now();
    const result = await runProcess(
      'node', [entryPath],
      { cwd: opDir, env, timeoutMs: timeoutSeconds * 1000 },
      { stdoutFile, stderrFile },
    );
    const durationMs = Date.now() - start;

    if (result.timedOut) {
      return res.json({
        status: 'timeout', durationMs, exitCode: 124,
        errorType: 'TIMEOUT',
        errorMessage: `Script exceeded timeout of ${timeoutSeconds}s`,
      });
    }

    if (result.exitCode === 0) {
      return res.json({
        status: 'success', durationMs, exitCode: 0,
      });
    }

    const errorType = result.exitCode === 2 ? 'OUTPUT_INVALID' : 'RUNTIME_ERROR';
    return res.json({
      status: 'failure', durationMs, exitCode: result.exitCode,
      errorType,
      errorMessage: result.spawnError
        ? `Could not start the script: ${result.spawnError}`
        : `Script exited with code ${result.exitCode}; see stderr.log`,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json(
      errorSummary('RUNTIME_ERROR', `Unexpected runner error: ${err.message}`),
    );
  }
});

/**
 * Make sure `envDir` holds this adapter's current dependencies.
 *
 * Three things this does that a plain "does the directory exist?" test cannot:
 *
 *   - A FAILED install is not cached. The marker file is written only after npm
 *     exits 0, so a crashed or half-finished install is retried by the next
 *     request instead of leaving every later run to fail on a missing module,
 *     permanently, until somebody deletes the directory by hand.
 *
 *   - An EDITED package.json is picked up. The marker holds a fingerprint of the
 *     package files, so changing them re-runs the install. (Packages removed
 *     from package.json are not pruned — npm is asked to install what is now
 *     declared, not to make the tree match it exactly.)
 *
 *   - Concurrent first-requests do not race, via withInstallLock.
 *
 * `npm install` is used rather than `npm ci` for symmetry with the other
 * runners' authoring model: the user declares top-level deps and the installer
 * resolves transitives. package-lock.json is optional — if present it is copied
 * alongside so power users get deterministic installs, otherwise npm writes its
 * own lockfile into .installed/ during the run.
 */
async function ensureDependencies(scriptDir, envDir, installLogFile, timeoutSeconds) {
  const fingerprint = dependencyFingerprint(scriptDir);

  // Fast path, taken by every request after the first: one file read, no lock.
  if (installIsCurrent(envDir, fingerprint)) {
    return { ok: true };
  }

  return withInstallLock(scriptDir, async () => {
    // Re-checked under the lock: another request may have done the work while
    // we were queued behind it.
    if (installIsCurrent(envDir, fingerprint)) {
      return { ok: true };
    }

    const pkgJson = path.join(scriptDir, 'package.json');
    const lockFile = path.join(scriptDir, 'package-lock.json');

    fs.mkdirSync(envDir, { recursive: true });

    if (!fs.existsSync(pkgJson)) {
      safeWrite(installLogFile, 'No package.json found. Skipping install.\n');
    } else {
      // Copied into envDir so node_modules lands there rather than in the
      // adapter directory beside the source.
      fs.copyFileSync(pkgJson, path.join(envDir, 'package.json'));
      if (fs.existsSync(lockFile)) {
        fs.copyFileSync(lockFile, path.join(envDir, 'package-lock.json'));
      }

      const installResult = await runProcess(
        'npm', ['install', '--no-audit', '--no-fund'],
        { cwd: envDir, timeoutMs: Math.max(timeoutSeconds, 600) * 1000 },
        { stdoutFile: installLogFile, stderrFile: installLogFile },
      );

      if (installResult.timedOut) {
        return { ok: false, exitCode: 124, error: 'npm install exceeded the install timeout; see install.log' };
      }
      if (installResult.exitCode !== 0) {
        return {
          ok: false,
          exitCode: installResult.exitCode,
          error: installResult.spawnError
            ? `Could not start npm: ${installResult.spawnError}`
            : `npm install exited with code ${installResult.exitCode}; see install.log`,
        };
      }
    }

    // Last, and only on success — this is what the fast path trusts.
    try {
      fs.writeFileSync(path.join(envDir, INSTALL_MARKER_NAME), fingerprint);
    } catch (err) {
      return { ok: false, error: `Failed to record the install marker: ${err.message}` };
    }

    return { ok: true };
  });
}

/** True when envDir holds dependencies installed for this fingerprint. */
function installIsCurrent(envDir, fingerprint) {
  try {
    return fs.readFileSync(path.join(envDir, INSTALL_MARKER_NAME), 'utf8').trim() === fingerprint;
  } catch {
    return false;
  }
}

/**
 * Identifies what should be installed: the content of package.json and
 * package-lock.json, or the absence of them. Content rather than mtime, so
 * re-uploading an unchanged adapter does not force a reinstall.
 */
function dependencyFingerprint(scriptDir) {
  const hash = crypto.createHash('sha256');
  let found = false;
  for (const name of ['package.json', 'package-lock.json']) {
    try {
      hash.update(name);
      hash.update(fs.readFileSync(path.join(scriptDir, name)));
      found = true;
    } catch {
      // Absent: nothing to add. Its absence is part of the fingerprint by way
      // of not contributing, and `found` records whether anything did.
    }
  }
  return found ? 'sha256:' + hash.digest('hex') : 'none';
}

/**
 * Run a command, streaming its output straight to files, with a wall-clock
 * timeout that kills the whole process group.
 *
 * `spawn` with the log files as the child's stdio, rather than execFile: with
 * execFile all output is buffered in this process first, so a chatty adapter
 * cost the runner up to `maxBuffer` of heap — and exceeding that limit killed
 * the child and set `error.killed`, which the old code read as a TIMEOUT.
 * Failures were therefore reported as the wrong thing entirely. Streaming has
 * no limit to exceed and no buffer to hold.
 *
 * `detached` puts the child in its own process group so the timeout can signal
 * the group and take its grandchildren with it. Signalling the child alone — as
 * execFile's own timeout does — leaves anything the script started still
 * running and still writing into the operation directory after the run has been
 * reported as timed out.
 */
function runProcess(cmd, args, options, logs) {
  return new Promise((resolve) => {
    let stdoutFd;
    let stderrFd;
    try {
      stdoutFd = fs.openSync(logs.stdoutFile, 'a');
      // One file for both streams (npm install) shares the descriptor, so the
      // two streams interleave in order instead of overwriting each other.
      stderrFd = logs.stderrFile === logs.stdoutFile ? stdoutFd : fs.openSync(logs.stderrFile, 'a');
    } catch (err) {
      if (stdoutFd !== undefined) { try { fs.closeSync(stdoutFd); } catch { } }
      return resolve({ exitCode: -1, timedOut: false, spawnError: `cannot open log files: ${err.message}` });
    }

    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', stdoutFd, stderrFd],
      detached: true,
    });

    let timedOut = false;
    let killTimer = null;

    const closeFds = () => {
      try { fs.closeSync(stdoutFd); } catch { }
      if (stderrFd !== stdoutFd) { try { fs.closeSync(stderrFd); } catch { } }
    };

    const signalGroup = (signal) => {
      try {
        // Negative pid = the whole process group.
        process.kill(-child.pid, signal);
      } catch (err) {
        // ESRCH simply means it has already exited.
        if (err.code !== 'ESRCH') {
          console.error(`Failed to ${signal} process group ${child.pid}:`, err.message);
        }
      }
    };

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      signalGroup('SIGTERM');
      // Whatever ignored SIGTERM gets SIGKILL. Cleared on exit so a script that
      // stops promptly is never signalled twice.
      killTimer = setTimeout(() => signalGroup('SIGKILL'), KILL_GRACE_MS);
    }, options.timeoutMs || 300000);

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      if (killTimer) clearTimeout(killTimer);
      closeFds();
      resolve({ exitCode: -1, timedOut: false, spawnError: err.message });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeoutHandle);
      if (killTimer) clearTimeout(killTimer);
      closeFds();
      if (timedOut) {
        return resolve({ exitCode: 124, timedOut: true });
      }
      // Killed by a signal we did not send (OOM killer, an operator, a crash):
      // a real failure, and not a timeout. `code` is null in that case.
      resolve({ exitCode: code === null ? 128 : code, timedOut: false, signal: signal || undefined });
    });
  });
}

/** The logs are a courtesy; failing to write one must not fail the run. */
function safeWrite(file, contents) {
  try {
    fs.writeFileSync(file, contents);
  } catch (err) {
    console.error(`Could not write ${file}:`, err.message);
  }
}

function errorSummary(errorType, message) {
  return {
    status: 'failure', durationMs: 0, exitCode: -1,
    errorType, errorMessage: message,
  };
}

const port = parseInt(process.env.JAVASCRIPT_RUNNER_PORT || '5103', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`JavaScript adapter runner listening on port ${port}`);
});

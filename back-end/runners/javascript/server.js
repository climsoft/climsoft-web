/**
 * Climsoft JavaScript adapter runner.
 *
 * Express wrapper that executes user-supplied JavaScript adapter scripts.
 * Dependencies are installed into <scriptDir>/.installed/ on first run.
 * Log files are written to outputDir by convention.
 */

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const INSTALLED_DIR_NAME = '.installed';

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', runtime: 'javascript', version: process.version });
});

app.post('/run', async (req, res) => {
  try {
    const body = req.body;
    const required = ['scriptDir', 'entryPoint', 'inputFilePathName', 'outputDir', 'metadataFile', 'timeoutSeconds'];
    const missing = required.filter(k => !(k in body));
    if (missing.length > 0) {
      return res.json(errorSummary('RUNTIME_ERROR', `Missing required fields: ${missing.join(', ')}`));
    }

    const { scriptDir, entryPoint, inputFilePathName, outputDir, metadataFile, timeoutSeconds } = body;

    // Derive paths by convention
    const envDir = path.join(scriptDir, INSTALLED_DIR_NAME);
    const warningsFile = path.join(outputDir, 'warnings.jsonl');
    const stdoutFile = path.join(outputDir, 'stdout.log');
    const stderrFile = path.join(outputDir, 'stderr.log');
    const installLogFile = path.join(outputDir, 'install.log');

    const entryPath = path.join(scriptDir, entryPoint);
    if (!fs.existsSync(entryPath)) {
      // TODO. Return the correct http status code?
      return res.json(errorSummary('RUNTIME_ERROR', `Entry point not found: ${entryPath}`));
    }

    // Step 1: install dependencies if .installed doesn't exist
    if (!fs.existsSync(envDir)) {
      const pkgJson = path.join(scriptDir, 'package.json');
      const lockFile = path.join(scriptDir, 'package-lock.json');

      if (!fs.existsSync(pkgJson) || !fs.existsSync(lockFile)) {
        fs.mkdirSync(envDir, { recursive: true });
        fs.writeFileSync(installLogFile, 'No package.json/package-lock.json found. Skipping install.\n');
      } else {
        // Copy package files to envDir so node_modules lands there
        fs.mkdirSync(envDir, { recursive: true });
        fs.copyFileSync(pkgJson, path.join(envDir, 'package.json'));
        fs.copyFileSync(lockFile, path.join(envDir, 'package-lock.json'));

        const installResult = await runProcess(
          'npm', ['ci', '--no-audit', '--no-fund'],
          { cwd: envDir, timeout: Math.max(timeoutSeconds, 600) * 1000 },
          installLogFile,
        );

        if (installResult.exitCode !== 0) {
          return res.json({
            status: 'failure', durationMs: 0, exitCode: installResult.exitCode,

            errorType: 'INSTALL_FAILED',
            errorMessage: `npm ci exited with code ${installResult.exitCode}; see install.log`,
          });
        }
      }
    }

    // Step 2: run the script
    const env = {
      ...process.env,
      CLIMSOFT_INPUT_FILE_PATH_NAME: inputFilePathName,
      CLIMSOFT_OUTPUT_DIR: outputDir,
      CLIMSOFT_METADATA_FILE: metadataFile,
      CLIMSOFT_WARNINGS_FILE: warningsFile,
      CLIMSOFT_RUNNER: 'javascript',
      NODE_PATH: path.join(envDir, 'node_modules'),
    };

    const start = Date.now();
    const result = await runProcess(
      'node', [entryPath],
      { cwd: scriptDir, env, timeout: timeoutSeconds * 1000 },
      stdoutFile, stderrFile,
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
      errorMessage: `Script exited with code ${result.exitCode}; see stderr.log`,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json(
      errorSummary('RUNTIME_ERROR', `Unexpected runner error: ${err.message}`),
    );
  }
});

function runProcess(cmd, args, options, stdoutFile, stderrFile) {
  return new Promise((resolve) => {
    const timeout = options.timeout || 300000;
    execFile(cmd, args, {
      ...options,
      timeout,
      maxBuffer: 50 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (stdoutFile) fs.writeFileSync(stdoutFile, stdout || '');
      if (stderrFile) fs.writeFileSync(stderrFile, stderr || '');

      if (error && error.killed) {
        resolve({ exitCode: 124, timedOut: true });
      } else {
        resolve({ exitCode: error ? (error.code || 1) : 0, timedOut: false });
      }
    });
  });
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

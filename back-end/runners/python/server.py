"""
Climsoft Python adapter runner.

A small Flask wrapper that executes user-supplied Python adapter scripts
in a controlled, per-script virtual environment.

Contract:

    POST /run
    {
        "scriptDirName":  "<adapter-uuid>",
        "operationId":    "<operation-uuid>",
        "inputRelPath":   "input/<filename>",
        "outputRelPath":  "output",
        "timeoutSeconds": 300
    }

    -> 200 {
        "status":           "success" | "failure" | "timeout",
        "durationMs":       1247,
        "exitCode":         0,
        "errorType":        "RUNTIME_ERROR",   (only on failure)
        "errorMessage":     "..."              (only on failure)
    }

Path model: the runner and the API share the adapters/operations volumes
but mount them at potentially different paths (in dev the API runs on the
host while the runner runs in Docker). The wire therefore carries only IDs
and operation-relative paths; the runner splices them onto its own
ADAPTERS_ROOT and OPERATIONS_ROOT to obtain absolute paths.

The entry point filename is not part of the request either — this runner
hardcodes `main.py` because the API enforces the convention at
upload-preview time.

Log file names (metadata.json, warnings.jsonl, stdout.log, stderr.log,
install.log) are conventions inside the output directory.

The script is invoked with the following environment variables:

    CLIMSOFT_INPUT_FILE_PATH_NAME
    CLIMSOFT_OUTPUT_DIR
    CLIMSOFT_METADATA_FILE
    CLIMSOFT_WARNINGS_FILE
    CLIMSOFT_SCRIPT_DIR

A run is one OS process, and that is deliberate — unlike the DuckDB runner,
which shares one long-lived engine, this runner cannot amortise anything
across runs without giving up the three jobs the process is doing at once:
isolating one adapter's module state from another's, giving the timeout
something it can actually kill, and containing a crash. What IS amortised is
the per-adapter virtualenv, below.

The script's working directory is the OPERATION directory, not the adapter
directory. Two concurrent runs of one adapter would otherwise share a working
directory, so anything written relative to `cwd` would collide; and stray
relative writes would accumulate in the adapter directory, which is meant to
hold code and is only reclaimed when the adapter itself is deleted. Sibling
imports are unaffected (`sys.path[0]` is the entry point's own directory), and
a script that needs to read a file shipped beside it has CLIMSOFT_SCRIPT_DIR.
"""

import fcntl
import hashlib
import os
import signal
import subprocess
import sys
import time
import traceback
import venv

from flask import Flask, request, jsonify

app = Flask(__name__)

INSTALLED_DIR_NAME = '.installed'
ENTRY_POINT = 'main.py'
# Volume mount points inside this container. Hardcoded to match every
# docker-compose profile (dev / test / prod).
ADAPTERS_ROOT = '/app/adapters'
OPERATIONS_ROOT = '/app/operations'
# Written INSIDE the venv only after dependencies install cleanly, and holds a
# fingerprint of what was installed. Its presence is the "this venv is usable"
# signal; the directory existing is not, because a crashed pip leaves the
# directory behind.
INSTALL_MARKER_NAME = '.climsoft-install-ok'
# Serialises installs for one adapter. Kept inside the adapter directory for the
# same reason as .installed/ — the API's adapter-directory sweep reclaims it
# with its adapter, so nothing else has to know it exists.
INSTALL_LOCK_NAME = '.installed.lock'
# How long a timed-out process group gets to exit on SIGTERM before SIGKILL.
KILL_GRACE_SECONDS = 5


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'runtime': 'python', 'version': sys.version.split()[0]}), 200


@app.route('/run', methods=['POST'])
def run_adapter():
    try:
        body = request.get_json()

        print(f"Received request body: {body}")

        if not body:
            return jsonify(_error_summary('RUNTIME_ERROR', 'Request body must be JSON')), 200

        required = ['scriptDirName', 'operationId', 'inputRelPath', 'outputRelPath', 'timeoutSeconds']
        missing = [k for k in required if k not in body]
        if missing:
            return jsonify(_error_summary(
                'RUNTIME_ERROR',
                f'Missing required fields: {", ".join(missing)}',
            )), 200

        script_dir = os.path.join(ADAPTERS_ROOT, body['scriptDirName'])
        op_dir = os.path.join(OPERATIONS_ROOT, body['operationId'])
        input_file_path_name = os.path.join(op_dir, body['inputRelPath'])
        output_dir = os.path.join(op_dir, body['outputRelPath'])
        timeout_seconds = int(body['timeoutSeconds'])

        print(f"Received run request for script at {script_dir} with entry point {ENTRY_POINT}")

        # Derive paths by convention
        env_dir = os.path.join(script_dir, INSTALLED_DIR_NAME)
        metadata_file = os.path.join(output_dir, 'metadata.json')
        warnings_file = os.path.join(output_dir, 'warnings.jsonl')
        stdout_file = os.path.join(output_dir, 'stdout.log')
        stderr_file = os.path.join(output_dir, 'stderr.log')
        install_log_file = os.path.join(output_dir, 'install.log')

        entry_path = os.path.join(script_dir, ENTRY_POINT)
        if not os.path.isfile(entry_path):
            return jsonify(_error_summary(
                'RUNTIME_ERROR',
                f'Entry point not found: {entry_path}',
            )), 200

        # Step 1: make sure the per-adapter venv exists and matches the
        # adapter's current requirements.txt. Does nothing after the first run,
        # or after a run that follows an edit to requirements.txt.
        install_ok, install_err = _ensure_venv(
            script_dir, env_dir, install_log_file, timeout_seconds,
        )
        if not install_ok:
            return jsonify(_error_summary('INSTALL_FAILED', install_err)), 200

        # Step 2: launch the script under the venv's python interpreter.
        python_exe = _venv_python(env_dir)
        if not os.path.isfile(python_exe):
            return jsonify(_error_summary(
                'INSTALL_FAILED',
                f'venv python not found at {python_exe}',
            )), 200

        environ = os.environ.copy()
        environ.update({
            'CLIMSOFT_INPUT_FILE_PATH_NAME': input_file_path_name,
            'CLIMSOFT_OUTPUT_DIR': output_dir,
            'CLIMSOFT_METADATA_FILE': metadata_file,
            'CLIMSOFT_WARNINGS_FILE': warnings_file,
            'CLIMSOFT_SCRIPT_DIR': script_dir,
            'CLIMSOFT_RUNNER': 'python',
        })

        start = time.monotonic()
        with open(stdout_file, 'wb') as out_f, open(stderr_file, 'wb') as err_f:
            # start_new_session puts the script in its own process group, which
            # is what makes the timeout below able to kill everything it
            # started. subprocess.run(timeout=...) signals only the direct
            # child, so a script that shells out leaves its grandchildren
            # running — holding the operation directory open, and still writing
            # to it, after the run has been reported as timed out.
            proc = subprocess.Popen(
                [python_exe, entry_path],
                cwd=op_dir,
                env=environ,
                stdout=out_f,
                stderr=err_f,
                start_new_session=True,
            )
            try:
                proc.wait(timeout=timeout_seconds)
            except subprocess.TimeoutExpired:
                _kill_process_group(proc)
                duration_ms = int((time.monotonic() - start) * 1000)
                return jsonify({
                    'status': 'timeout',
                    'durationMs': duration_ms,
                    'exitCode': 124,
                    'errorType': 'TIMEOUT',
                    'errorMessage': f'Script exceeded wall-clock timeout of {timeout_seconds}s',
                }), 200

        duration_ms = int((time.monotonic() - start) * 1000)

        if proc.returncode == 0:
            return jsonify({
                'status': 'success',
                'durationMs': duration_ms,
                'exitCode': 0,
            }), 200

        # Non-zero exit code.
        error_type = 'OUTPUT_INVALID' if proc.returncode == 2 else 'RUNTIME_ERROR'
        return jsonify({
            'status': 'failure',
            'durationMs': duration_ms,
            'exitCode': proc.returncode,
            'errorType': error_type,
            'errorMessage': f'Script exited with code {proc.returncode}; see stderr.log',
        }), 200

    except Exception as e:
        app.logger.error(f'Unexpected error: {traceback.format_exc()}')
        return jsonify(_error_summary(
            'RUNTIME_ERROR',
            f'Unexpected runner error: {str(e)}',
        )), 500


def _kill_process_group(proc):
    """
    Stop a timed-out script and everything it started.

    SIGTERM to the whole group first, so a script with a cleanup handler gets to
    run it, then SIGKILL to whatever is still alive. Signals go to the NEGATIVE
    pid, which is the process group the run was given by start_new_session.
    """
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return  # already gone
    except Exception as e:
        app.logger.error(f'Failed to SIGTERM process group {proc.pid}: {e}')

    try:
        proc.wait(timeout=KILL_GRACE_SECONDS)
        return
    except subprocess.TimeoutExpired:
        pass

    try:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait(timeout=KILL_GRACE_SECONDS)
    except ProcessLookupError:
        pass
    except Exception as e:
        app.logger.error(f'Failed to SIGKILL process group {proc.pid}: {e}')


def _ensure_venv(script_dir, env_dir, install_log_file, timeout_seconds):
    """
    Make sure `env_dir` holds a venv with this adapter's current requirements
    installed. Returns (ok, error_message).

    Three things this does that a plain "does the directory exist?" test cannot:

      - A FAILED install is not cached. The marker file is written only after
        pip exits 0, so a crashed or half-finished install is retried by the
        next request instead of leaving every later run to fail at import time,
        permanently, until somebody deletes the directory by hand.

      - An EDITED requirements.txt is picked up. The marker holds a fingerprint
        of the file, so changing it re-runs the install. (Packages removed from
        the file are not uninstalled — pip is asked to install what is now
        declared, not to make the venv match it exactly.)

      - Concurrent first-requests do not race. The API can have several runs of
        one adapter in flight; without a lock they would build the same venv at
        the same time and interleave into a broken one.

    The lock is an flock, not a threading.Lock, so it holds between processes as
    well as threads — the dev server is threaded today, but a WSGI server with
    workers would make an in-process lock useless.
    """
    fingerprint = _requirements_fingerprint(script_dir)

    # Fast path, taken by every request after the first: two stats, no lock.
    if _install_is_current(env_dir, fingerprint):
        return True, None

    # script_dir is known to exist — the entry point was stat'ed before this.
    lock_path = os.path.join(script_dir, INSTALL_LOCK_NAME)
    with open(lock_path, 'w') as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            # Re-checked under the lock: another request may have done the work
            # while we were queued behind it.
            if _install_is_current(env_dir, fingerprint):
                return True, None

            if not os.path.isfile(_venv_python(env_dir)):
                try:
                    venv.EnvBuilder(with_pip=True, clear=False, symlinks=True).create(env_dir)
                except Exception as e:
                    return False, f'Failed to create venv: {str(e)}'

            requirements_file = os.path.join(script_dir, 'requirements.txt')
            if os.path.isfile(requirements_file):
                pip_exe = _venv_pip(env_dir)
                if not os.path.isfile(pip_exe):
                    return False, f'pip not found at {pip_exe}'
                try:
                    with open(install_log_file, 'wb') as log_f:
                        log_f.write(f'Installing dependencies from {requirements_file}\n'.encode('utf-8'))
                        log_f.flush()
                        proc = subprocess.run(
                            [pip_exe, 'install', '--no-cache-dir', '-r', requirements_file],
                            stdout=log_f,
                            stderr=subprocess.STDOUT,
                            timeout=max(timeout_seconds, 600),
                            check=False,
                        )
                    if proc.returncode != 0:
                        return False, f'pip install exited with code {proc.returncode}; see install.log'
                except subprocess.TimeoutExpired:
                    return False, 'pip install exceeded the install timeout'
                except Exception as e:
                    return False, f'Unexpected install error: {str(e)}'
            else:
                try:
                    with open(install_log_file, 'w') as f:
                        f.write('No requirements.txt found at the script root. Skipping install.\n')
                except Exception:
                    pass  # the log is a courtesy; not being able to write it is not a failure

            # Last, and only on success — this is what the fast path trusts.
            try:
                with open(os.path.join(env_dir, INSTALL_MARKER_NAME), 'w') as marker:
                    marker.write(fingerprint)
            except Exception as e:
                return False, f'Failed to record the install marker: {str(e)}'

            return True, None
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _install_is_current(env_dir, fingerprint):
    """True when env_dir holds a usable venv installed for this fingerprint."""
    marker_path = os.path.join(env_dir, INSTALL_MARKER_NAME)
    try:
        with open(marker_path, 'r') as marker:
            if marker.read().strip() != fingerprint:
                return False
    except OSError:
        return False
    return os.path.isfile(_venv_python(env_dir))


def _requirements_fingerprint(script_dir):
    """
    Identifies what should be installed: the content of requirements.txt, or the
    absence of one. Content rather than mtime, so re-uploading an unchanged
    adapter does not force a reinstall.
    """
    requirements_file = os.path.join(script_dir, 'requirements.txt')
    try:
        with open(requirements_file, 'rb') as f:
            return 'sha256:' + hashlib.sha256(f.read()).hexdigest()
    except OSError:
        return 'none'


def _venv_python(env_dir):
    return os.path.join(env_dir, 'bin', 'python')


def _venv_pip(env_dir):
    return os.path.join(env_dir, 'bin', 'pip')


def _error_summary(error_type, message):
    return {
        'status': 'failure',
        'durationMs': 0,
        'exitCode': -1,
        'errorType': error_type,
        'errorMessage': message,
    }


if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_RUNNER_PORT', 5101))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

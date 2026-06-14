"""
Climsoft Python adapter runner.

A small Flask wrapper that executes user-supplied Python adapter scripts
in a controlled, per-script virtual environment.

Contract:

    POST /run
    {
        "scriptDir":      "/app/adapters/<uuid>",
        "entryPoint":     "main.py",
        "inputFilePathName":       "/app/operations/<uuid>/input/<filename>",
        "outputDir":      "/app/operations/<uuid>/output",
        "metadataFile":   "/app/operations/<uuid>/output/metadata.json",
        "timeoutSeconds": 300
    }

    -> 200 {
        "status":           "success" | "failure" | "timeout",
        "durationMs":       1247,
        "exitCode":         0,
        "errorType":        "RUNTIME_ERROR",   (only on failure)
        "errorMessage":     "..."              (only on failure)
    }

Dependencies are installed into <scriptDir>/.installed/ on first run.
The runner derives all log file paths from outputDir by convention.

The script is invoked with the following environment variables:

    CLIMSOFT_INPUT_FILE_PATH_NAME
    CLIMSOFT_OUTPUT_DIR
    CLIMSOFT_METADATA_FILE
    CLIMSOFT_WARNINGS_FILE
"""

import os
import subprocess
import sys
import time
import traceback
import venv

from flask import Flask, request, jsonify

app = Flask(__name__)

INSTALLED_DIR_NAME = '.installed'

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'runtime': 'python', 'version': sys.version.split()[0]}), 200


@app.route('/run', methods=['POST'])
def run_adapter():
    try:
        body = request.get_json()
        if not body:
            return jsonify(_error_summary('RUNTIME_ERROR', 'Request body must be JSON')), 200

        required = ['scriptDir', 'entryPoint', 'inputFilePathName', 'outputDir', 'metadataFile', 'timeoutSeconds']
        missing = [k for k in required if k not in body]
        if missing:
            return jsonify(_error_summary(
                'RUNTIME_ERROR',
                f'Missing required fields: {", ".join(missing)}',
            )), 200

        script_dir = body['scriptDir']
        entry_point = body['entryPoint']
        input_file_path_name = body['inputFilePathName']
        output_dir = body['outputDir']
        metadata_file = body['metadataFile']
        timeout_seconds = int(body['timeoutSeconds'])

        # Derive paths by convention
        env_dir = os.path.join(script_dir, INSTALLED_DIR_NAME)
        warnings_file = os.path.join(output_dir, 'warnings.jsonl')
        stdout_file = os.path.join(output_dir, 'stdout.log')
        stderr_file = os.path.join(output_dir, 'stderr.log')
        install_log_file = os.path.join(output_dir, 'install.log')

        entry_path = os.path.join(script_dir, entry_point)
        if not os.path.isfile(entry_path):
            return jsonify(_error_summary(
                'RUNTIME_ERROR',
                f'Entry point not found: {entry_path}',
            )), 200

        # Step 1: ensure the per-script venv exists. First run installs
        # dependencies from requirements.txt; subsequent runs reuse it.
        if not os.path.isdir(env_dir):
            install_ok, install_err = _create_and_populate_venv(
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
            'CLIMSOFT_RUNNER': 'python',
        })

        start = time.monotonic()
        with open(stdout_file, 'wb') as out_f, open(stderr_file, 'wb') as err_f:
            try:
                proc = subprocess.run(
                    [python_exe, entry_path],
                    cwd=script_dir,
                    env=environ,
                    stdout=out_f,
                    stderr=err_f,
                    timeout=timeout_seconds,
                    check=False,
                )
            except subprocess.TimeoutExpired:
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


def _create_and_populate_venv(script_dir, env_dir, install_log_file, timeout_seconds):
    """
    Creates a fresh venv at env_dir and installs dependencies from
    `requirements.txt` at the root of script_dir.
    """
    try:
        os.makedirs(os.path.dirname(env_dir), exist_ok=True)
        venv.EnvBuilder(with_pip=True, clear=False, symlinks=True).create(env_dir)
    except Exception as e:
        return False, f'Failed to create venv: {str(e)}'

    requirements_file = os.path.join(script_dir, 'requirements.txt')
    if not os.path.isfile(requirements_file):
        with open(install_log_file, 'w') as f:
            f.write('No requirements.txt found at the script root. Skipping install.\n')
        return True, None

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
        return True, None
    except subprocess.TimeoutExpired:
        return False, 'pip install exceeded the install timeout'
    except Exception as e:
        return False, f'Unexpected install error: {str(e)}'


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

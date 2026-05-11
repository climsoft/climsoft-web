/**
 * Mirrors the backend `AdapterErrorType` enum. Structured error types
 * produced by the adapter runner pipeline; the UI uses these to pick a
 * user-friendly message for each failure mode.
 */
export enum AdapterErrorType {
    MANIFEST_INVALID = 'MANIFEST_INVALID',
    INSTALL_FAILED = 'INSTALL_FAILED',
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    TIMEOUT = 'TIMEOUT',
    OOM_KILLED = 'OOM_KILLED',
    OUTPUT_MISSING = 'OUTPUT_MISSING',
    OUTPUT_INVALID = 'OUTPUT_INVALID',
    RUNNER_UNREACHABLE = 'RUNNER_UNREACHABLE',
    RUNNER_DISABLED = 'RUNNER_DISABLED',
}

export interface AdapterWarning {
    message: string;
    detail?: Record<string, unknown>;
}

export interface AdapterError {
    type: AdapterErrorType;
    message: string;
    detail?: Record<string, unknown>;
}

/**
 * Mirrors `AdapterTestRunResponseDto`. Returned by
 * `POST /adapters/:id/test-run`.
 */
export interface AdapterTestRunResponseModel {
    status: 'success' | 'failure' | 'timeout';
    durationMs: number;
    outputFileName: string | null;
    stdout: string;
    stderr: string;
    installLog: string | null;
    warnings: AdapterWarning[];
    errors: AdapterError[];
}

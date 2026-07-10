/**
 * Mirrors the backend `FileProcessingErrorType` enum. Structured error
 * types produced by the adapter runner pipeline; the UI uses these to
 * pick a user-friendly message for each failure mode.
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

export interface AdapterError {
    type: AdapterErrorType;
    message: string;
    detail?: Record<string, unknown>;
}

/** Descriptor for a file produced by an adapter run. */
export interface AdapterProducedFile {
    name: string;
    sizeBytes: number;
}

/**
 * Mirrors `AdapterTestRunResponseDto`. Returned by
 * `POST /adapters/test-run-preview`.
 */
export interface AdapterTestRunResponseModel {
    status: 'success' | 'failure' | 'timeout';
    durationMs: number;
    /** Files the adapter script wrote (excluding well-known log files). */
    outputFiles: AdapterProducedFile[];
    /**
     * Runner-produced sidecar files present on disk: `metadata.json`,
     * `warnings.jsonl`, `stdout.log`, `stderr.log`, `install.log`
     * (subset of those that actually exist).
     */
    logFiles: AdapterProducedFile[];
    /** UUID of the on-disk operation dir, or null when there is nothing to download. */
    operationId: string | null;
    /** Single structured error surfaced by the runner (mirrors backend `error?: FileProcessingError`). */
    error?: AdapterError;
}

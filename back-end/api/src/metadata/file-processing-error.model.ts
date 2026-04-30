/**
 * Structured error types produced by the duckdb transformers or adapter runner pipeline. These
 * are designed to overlap conceptually with metadata import previews, import preview and connector imports and exports
 * So the import wizards and connector logs can render the errors through the same UI components.
 */
export enum FileProcessingErrorType {
    // Used by DuckDB tranformers
    COLUMN_NOT_FOUND = 'COLUMN_NOT_FOUND',
    INVALID_COLUMN_POSITION = 'INVALID_COLUMN_POSITION',
    SQL_EXECUTION_ERROR = 'SQL_EXECUTION_ERROR',

    // Used by adapter
    MANIFEST_INVALID = 'MANIFEST_INVALID',
    INSTALL_FAILED = 'INSTALL_FAILED',
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    TIMEOUT = 'TIMEOUT',
    OOM_KILLED = 'OOM_KILLED',
    OUTPUT_MISSING = 'OUTPUT_MISSING',
    //OUTPUT_INVALID = 'OUTPUT_INVALID',
    RUNNER_UNREACHABLE = 'RUNNER_UNREACHABLE',
    RUNNER_DISABLED = 'RUNNER_DISABLED',
}

/** Structured error surfaced by the connector, import, export and adapter runner pipeline. */
export interface FileProcessingError {
    type: FileProcessingErrorType,
    message: string;
    detail?: string;
}

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
    /**
     * A date in the file did not match the specification's date/time format.
     * The whole file fails — one bad date is enough — rather than importing the
     * rows that did parse. A specification (or logger configuration) problem:
     * the connector records the file as `failed`, which is retried every run, so
     * correcting the format brings the file in without any further action.
     */
    DATETIME_FORMAT_MISMATCH = 'DATETIME_FORMAT_MISMATCH',
    /**
     * A row is missing a value every observation must have — station, element,
     * level, date/time or interval. Failed rather than dropped, so a file that
     * is malformed is seen rather than partially imported.
     */
    MISSING_REQUIRED_VALUE = 'MISSING_REQUIRED_VALUE',
    /**
     * Nothing to import, and nothing wrong: the file had no data rows at all, or
     * every value in it was missing and the specification does not import
     * missing values. The connector records the file as `empty`, the same
     * outcome as a zero-byte file — typically a data logger recording with its
     * instruments disconnected.
     */
    NO_DATA = 'NO_DATA',

    // Used by adapter
    MANIFEST_INVALID = 'MANIFEST_INVALID',
    INSTALL_FAILED = 'INSTALL_FAILED',
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    TIMEOUT = 'TIMEOUT',
    OOM_KILLED = 'OOM_KILLED',
    OUTPUT_MISSING = 'OUTPUT_MISSING',
    RUNNER_UNREACHABLE = 'RUNNER_UNREACHABLE',
    RUNNER_DISABLED = 'RUNNER_DISABLED',
}

/** Structured error surfaced by the connector, import, export and adapter runner pipeline. */
export interface FileProcessingError {
    type: FileProcessingErrorType,
    message: string;
    detail?: string;
}

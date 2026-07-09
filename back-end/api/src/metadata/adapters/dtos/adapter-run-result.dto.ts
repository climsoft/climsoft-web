import {  FileProcessingError } from "src/metadata/file-processing-error.model";


/** Warning emitted by the adapter script via `warnings.jsonl`. */
export interface AdapterWarning {
    message: string;
    detail?: Record<string, unknown>;
}


/**
 * Response returned by the `POST /adapters/test-run-preview` endpoint.
 *
 * The dialog's test-run pane renders this directly: the summary at the
 * top (`status`, `durationMs`), the logs in collapsible sections, and
 * the warnings/errors as badge lists.
 *
 * `operationId` is populated whenever the run produced at least one
 * output file so the client can hit
 * `GET /adapters/test-run-preview/output/:operationId` to download the
 * full output directory (including log files) as a zip.
 */
export class AdapterTestRunResponseDto {
    status!: 'success' | 'failure' | 'timeout';
    durationMs!: number;
    /**
     * Basenames of files produced by the adapter, in whatever order the
     * runner enumerated them. Empty when nothing was written.
     */
    outputFiles!: string[];
    /** UUID of the operation directory kept on disk for download. Null when there is nothing to download. */
    operationId!: string | null;
    stdout!: string;
    stderr!: string;
    /** Output captured during first-run dependency install, or null on cached runs. */
    installLog!: string | null;
    warnings!: AdapterWarning[];
    error?: FileProcessingError;
}

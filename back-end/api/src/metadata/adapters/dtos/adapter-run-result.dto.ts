import {  FileProcessingError } from "src/metadata/file-processing-error.model";


/** Warning emitted by the adapter script via `warnings.jsonl`. */
export interface AdapterWarning {
    message: string;
    detail?: Record<string, unknown>;
}


/**
 * Response returned by the `POST /adapters/:id/test-run` endpoint.
 *
 * The dialog's test-run pane renders this directly: the summary at the
 * top (`status`, `durationMs`), the logs in collapsible sections, and
 * the warnings/errors as badge lists.
 */
export class AdapterTestRunResponseDto {
    status!: 'success' | 'failure' ;
    durationMs!: number;
    /** Filename (not a path) of the produced output, or null if the run failed. */
    outputFileName!: string | null;
    stdout!: string;
    stderr!: string;
    /** Output captured during first-run dependency install, or null on cached runs. */
    installLog!: string | null;
    warnings!: AdapterWarning[];
    error?: FileProcessingError;
}

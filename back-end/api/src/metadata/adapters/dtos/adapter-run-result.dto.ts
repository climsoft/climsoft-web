import { FileProcessingError } from "src/metadata/file-processing-error.model";

/** Descriptor for a file produced by an adapter run. Shared shape for both output and log files. */
export interface AdapterProducedFile {
    /** Basename inside the operation output directory. */
    name: string;
    /** Size in bytes. */
    sizeBytes: number;
}

/**
 * Response returned by the `POST /adapters/test-run-preview` endpoint.
 *
 * The dialog's test-run pane renders this directly: the summary at the
 * top (`status`, `durationMs`, `error`) and a plain listing of the files
 * the runner produced with their sizes. To inspect log or output
 * contents the user downloads the whole operation directory as a zip.
 *
 * `operationId` is populated whenever the run produced at least one
 * output file so the client can hit
 * `GET /adapters/test-run-preview/output/:operationId` to download it.
 */
export class AdapterTestRunResponseDto {
    status!: 'success' | 'failure' | 'timeout';
    durationMs!: number;
    /** Files the adapter script wrote (excluding well-known log files). */
    outputFiles!: AdapterProducedFile[];
    /**
     * Well-known runner-produced sidecar files present on disk:
     * `metadata.json`, `warnings.jsonl`, `stdout.log`, `stderr.log`,
     * `install.log` (subset of those that actually exist).
     */
    logFiles!: AdapterProducedFile[];
    /** UUID of the operation directory kept on disk for download. Null when there is nothing to download. */
    operationId!: string | null;
    error?: FileProcessingError;
}

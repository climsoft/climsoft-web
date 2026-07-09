/**
 * A single entry in the file tree of an uploaded adapter zip.
 */
export interface FileTreeEntry {
    /** Relative path from the zip root, using forward slashes. */
    path: string;
    /** Whether this entry is a directory or a file. */
    isDirectory: boolean;
}

/**
 * Mirrors `AdapterUploadPreviewResponseDto`. Returned by
 * `POST /adapters/upload-preview`.
 *
 * Both `manifestError` and `entryPointError` are optional: absence means
 * "valid". The UI checks for their presence to decide whether the upload
 * can be saved.
 */
export interface AdapterUploadPreviewResponseModel {
    scriptDirName: string;
    fileTree: FileTreeEntry[];
    manifestError?: string;
    entryPointError?: string;
}

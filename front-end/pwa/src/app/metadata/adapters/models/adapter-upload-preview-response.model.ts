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
 */
export interface AdapterUploadPreviewResponseModel {
    scriptDirName: string;
    fileTree: FileTreeEntry[];
    manifestFound: boolean;
    manifestError?: string;
}

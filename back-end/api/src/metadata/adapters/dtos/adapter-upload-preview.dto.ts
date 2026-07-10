/**
 * A single entry in the file tree of an uploaded adapter zip.
 * The frontend renders this as a flat list with indentation based on depth,
 * or as a tree — either works because the entries are returned in
 * depth-first order.
 */
export interface FileTreeEntry {
    /** Relative path from the zip root, using forward slashes. */
    path: string;
    /** Whether this entry is a directory or a file. */
    isDirectory: boolean;
}

/**
 * Response returned by `POST /adapters/upload-preview`. Contains everything
 * the dialog needs to show the extracted contents and validate root-level
 * conventions before saving.
 *
 * Both `manifestError` and `entryPointError` are optional: absence means
 * "valid". The frontend surfaces each error string directly.
 */
export class AdapterUploadPreviewResponseDto {
    /** The UUID directory name where the zip was extracted. */
    scriptDirName!: string;
    /** Flat list of files and folders in the zip, depth-first order. */
    fileTree!: FileTreeEntry[];
    /** Populated when no accepted manifest file is present at the zip root. */
    manifestError?: string;
    /** Populated when the language's canonical entry point is not at the zip root. */
    entryPointError?: string;
}

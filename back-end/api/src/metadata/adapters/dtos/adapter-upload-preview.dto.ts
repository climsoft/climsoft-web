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
 * the dialog needs to show the extracted contents, validate the manifest,
 * and let the user pick an entry point before saving.
 */
export class AdapterUploadPreviewResponseDto {
    /** The UUID directory name where the zip was extracted. */
    scriptDirName!: string;
    /** Flat list of files and folders in the zip, depth-first order. */
    fileTree!: FileTreeEntry[];
    /** Whether the required manifest file for the language was found. */
    manifestFound!: boolean;
    /** If manifest is missing, describes what was expected. */
    manifestError?: string;
}

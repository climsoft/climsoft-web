import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

/**
 * Static helpers for building in-memory zip archives.
 *
 * Centralises the two shapes actually used in the codebase — "zip a whole
 * directory recursively" (adapter downloads) and "zip a flat list of files"
 * (multi-file manual export). Keeps the exclusion / naming rules consistent
 * across callers.
 */
export class ZipUtils {

    /**
     * Recursively adds a directory's contents into `zip`, using `zipPath` as
     * the destination prefix inside the archive. Directory names in
     * `excludeDirs` are skipped (matched on `entry.name`, not the full path).
     *
     * Use `zipPath = ''` for a flat archive rooted at the directory contents.
     */
    public static addDirToZip(
        zip: AdmZip,
        dirPath: string,
        zipPath: string = '',
        excludeDirs: Set<string> = new Set(),
    ): void {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            if (entry.isDirectory() && excludeDirs.has(entry.name)) continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                ZipUtils.addDirToZip(zip, fullPath, path.join(zipPath, entry.name), excludeDirs);
            } else {
                zip.addLocalFile(fullPath, zipPath === '' ? undefined : zipPath);
            }
        }
    }

    /**
     * Convenience: create a fresh zip, walk `dirPath` recursively into it,
     * and return the in-memory buffer.
     */
    public static buildZipBufferFromDir(
        dirPath: string,
        excludeDirs: Set<string> = new Set(),
    ): Buffer {
        const zip = new AdmZip();
        ZipUtils.addDirToZip(zip, dirPath, '', excludeDirs);
        return zip.toBuffer();
    }

    /**
     * Convenience: create a fresh zip and add a flat list of files into it.
     * Each entry says which file to read from disk (`fullPath`) and the name
     * it should appear as inside the archive (`nameInZip`).
     */
    public static buildZipBufferFromFiles(
        files: { fullPath: string; nameInZip: string }[],
    ): Buffer {
        const zip = new AdmZip();
        for (const f of files) {
            zip.addLocalFile(f.fullPath, '', f.nameInZip);
        }
        return zip.toBuffer();
    }
}

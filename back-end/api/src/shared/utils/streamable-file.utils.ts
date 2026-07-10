import path from 'node:path';
import { Readable } from 'node:stream';
import { StreamableFile } from '@nestjs/common';

/**
 * Static helpers for building NestJS `StreamableFile` responses with
 * consistent `Content-Type` / `Content-Disposition` handling.
 *
 * Callers used to inject `@Res({ passthrough: true })` and set headers on
 * the Express response object; `StreamableFile`'s own `type` / `disposition`
 * options are the modern replacement and keep the controller pure (returns
 * a value, no side effects on `res`).
 */
export class StreamableFileUtils {

    /**
     * Wraps a buffer or Readable stream as an attachment download. The
     * `Content-Type` is either the supplied `contentType` or inferred from
     * the filename's extension via {@link contentTypeFor}.
     */
    public static asAttachment(
        source: Buffer | Readable,
        filename: string,
        contentType?: string,
    ): StreamableFile {
        const options = {
            type: contentType ?? StreamableFileUtils.contentTypeFor(filename),
            disposition: `attachment; filename="${filename}"`,
        };
        // StreamableFile has two constructor overloads (Uint8Array vs Readable);
        // narrow here so TypeScript can pick the right one.
        return Buffer.isBuffer(source)
            ? new StreamableFile(source, options)
            : new StreamableFile(source, options);
    }

    /**
     * Maps a filename's extension to a MIME type. Covers the file kinds the
     * API currently serves (CSV previews, adapter zip bundles, BUFR export
     * payloads); everything else falls back to `application/octet-stream`,
     * which is the correct default for "browser, please download this".
     */
    public static contentTypeFor(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.csv':
                return 'text/csv';
            case '.zip':
                return 'application/zip';
            case '.json':
                return 'application/json';
            case '.txt':
                return 'text/plain';
            default:
                // e.g. .bufr4 and .bufr
                return 'application/octet-stream';
        }
    }
}

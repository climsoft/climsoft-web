import fs from 'node:fs';
import readline from 'node:readline';

export class FileLinesUtils {
    /**
     * Reads up to `maxLines` lines from the head of a text file, without
     * loading the whole file into memory. Handles both LF and CRLF line
     * endings and stops streaming as soon as the cap is reached.
     */
    public static async readHeadLines(filePath: string, maxLines: number): Promise<string[]> {
        if (maxLines <= 0) {
            return [];
        }

        const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        const lines: string[] = [];
        try {
            for await (const line of rl) {
                lines.push(line);
                if (lines.length >= maxLines) {
                    break;
                }
            }
        } finally {
            rl.close();
            stream.destroy();
        }
        return lines;
    }
}

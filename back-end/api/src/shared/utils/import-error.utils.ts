import { FileProcessingError, FileProcessingErrorType } from 'src/metadata/file-processing-error.model';


/**
 * Shared error classification utility for import transformers.
 * Centralises DuckDB (transformation phase) and PostgreSQL (database phase) error mapping
 * so that all transformers produce consistent PreviewError structures.
 */
export class ImportErrorUtils {

    /**
     * Classifies a DuckDB error thrown during a CSV transformation step.
     * Used by TabularImportTransformer, StationImportTransformer, and ElementImportTransformer.
     */
    public static classifyDuckDbError(error: unknown, stepName: string): FileProcessingError {
        // DuckDB quotes the offending value back in its message, and a value can
        // be anything a logger wrote — including NUL bytes, which Postgres
        // `text` refuses outright, so a failure to record the error would
        // replace the error. Real case: logger files that are nothing but
        // 491-1,248 NUL bytes.
        const msg = ImportErrorUtils.stripNul(error instanceof Error ? error.message : String(error));

        // A date that does not match the specification's format. The Date/Time
        // step parses with a bare `strptime`, so this is how a wrong format
        // surfaces — the connector records the file as failed and retries it,
        // so correcting the specification brings it in.
        const parse = /Could not parse string "([\s\S]*?)" according to format specifier "([^"]*)"/.exec(msg);
        if (parse) {
            const raw: string = parse[1];
            // DuckDB renders a NUL byte in the value as the two characters `\0`.
            // A value that is nothing but those is a corrupt file — the logger
            // wrote zeros where a record belonged — not a date in the wrong
            // format, and quoting a wall of `\0` back would say neither.
            const value: string = raw.replace(/\\0/g, '').trim();
            let message: string;
            if (value) {
                message = `${stepName}: The value "${ImportErrorUtils.truncate(value, 50)}" does not match the specification's date/time format "${parse[2]}".`;
            } else if (raw.includes('\\0')) {
                message = `${stepName}: The file holds unreadable NUL bytes where a date/time was expected; it is most likely corrupt.`;
            } else {
                message = `${stepName}: A row has a blank date/time, which cannot match the specification's format "${parse[2]}".`;
            }
            return { type: FileProcessingErrorType.DATETIME_FORMAT_MISMATCH, message, detail: msg };
        }

        // A required column left empty on some row — SET NOT NULL is how the
        // steps make a missing station, element, level, date/time or interval
        // fail the file rather than reach Postgres.
        //
        // Named from the STEP, not from the column in DuckDB's message: DuckDB
        // reports the column's name from before the step renamed it (seen as
        // `column6` for the interval and `combined_date_time_col` for a separated
        // date/time), which would mean nothing to a sysadmin. Each step that
        // runs SET NOT NULL owns exactly one required column, so the step name
        // is the column.
        if (msg.includes('NOT NULL constraint failed')) {
            return {
                type: FileProcessingErrorType.MISSING_REQUIRED_VALUE,
                message: `${stepName}: At least one row has no ${stepName.toLowerCase()} value, and every observation needs one.`,
                detail: msg,
            };
        }

        if (msg.includes('does not have a column named') || msg.includes('Referenced column') || msg.includes('not found in FROM clause')) {
            return {
                type: FileProcessingErrorType.COLUMN_NOT_FOUND,
                message: `${stepName}: A column referenced in the mapping was not found. Check that the column positions are correct.`,
                detail: msg,
            };
        }

        if (msg.includes('out of range') || msg.includes('Binder Error')) {
            return {
                type: FileProcessingErrorType.INVALID_COLUMN_POSITION,
                message: `${stepName}: A column position is out of range. The file has fewer columns than expected.`,
                detail: msg,
            };
        }

        return {
            type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
            message: `${stepName}: An error occurred while processing the file.`,
            detail: msg,
        };
    }

    /**
     * Classifies a PostgreSQL error thrown during the COPY/INSERT phase.
     * Uses PostgreSQL SQLSTATE codes (available on TypeORM's QueryFailedError) for precise mapping.
     */
    public static classifyPostgresError(error: unknown): FileProcessingError {
        const msg = error instanceof Error ? error.message : String(error);
        const code = (error as any)?.code as string | undefined;      
      
        if (code === '23505' || msg.includes('duplicate key')) {
            return {
                type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
                message: 'Database import failed: one or more rows violate a uniqueness constraint. Check for duplicate values in the file.',
                detail: msg,
            };
        }

        if (code === '23503' || msg.includes('violates foreign key constraint')) {
            return {
                type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
                message: 'Database import failed: one or more values reference an ID that does not exist in the database.',
                detail: msg,
            };
        }

        if (code === '23502' || msg.includes('null value in column')) {
            return {
                type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
                message: 'Database import failed: one or more required fields are missing values.',
                detail: msg,
            };
        }

        if (code?.startsWith('22') || msg.includes('invalid input syntax') || msg.includes('out of range')) {
            return {
                type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
                message: 'Database import failed: one or more values have an invalid format or are out of range.',
                detail: msg,
            };
        }

        return {
            type: FileProcessingErrorType.SQL_EXECUTION_ERROR,
            message: 'Database import failed: an unexpected error occurred.',
            detail: msg,
        };
    }

    /** Removes NUL bytes, which Postgres `text` columns cannot store. */
    public static stripNul(text: string): string {
        return text.replace(/\u0000/g, '');
    }

    private static truncate(text: string, max: number): string {
        return text.length > max ? `${text.slice(0, max)}…` : text;
    }

}

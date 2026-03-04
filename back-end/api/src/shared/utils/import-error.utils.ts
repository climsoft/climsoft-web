import { PreviewError } from 'src/observation/dtos/import-preview.dto';

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
    public static classifyDuckDbError(error: unknown, stepName: string): PreviewError {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes('does not have a column named') || msg.includes('Referenced column') || msg.includes('not found in FROM clause')) {
            return {
                type: 'COLUMN_NOT_FOUND',
                message: `${stepName}: A column referenced in the mapping was not found. Check that the column positions are correct.`,
                detail: msg,
            };
        }

        if (msg.includes('out of range') || msg.includes('Binder Error')) {
            return {
                type: 'INVALID_COLUMN_POSITION',
                message: `${stepName}: A column position is out of range. The file has fewer columns than expected.`,
                detail: msg,
            };
        }

        return {
            type: 'SQL_EXECUTION_ERROR',
            message: `${stepName}: An error occurred while processing the file.`,
            detail: msg,
        };
    }

    /**
     * Classifies a PostgreSQL error thrown during the COPY/INSERT phase.
     * Uses PostgreSQL SQLSTATE codes (available on TypeORM's QueryFailedError) for precise mapping.
     */
    public static classifyPostgresError(error: unknown): PreviewError {
        const msg = error instanceof Error ? error.message : String(error);
        const code = (error as any)?.code as string | undefined;      
      
        if (code === '23505' || msg.includes('duplicate key')) {
            return {
                type: 'SQL_EXECUTION_ERROR',
                message: 'Database import failed: one or more rows violate a uniqueness constraint. Check for duplicate values in the file.',
                detail: msg,
            };
        }

        if (code === '23503' || msg.includes('violates foreign key constraint')) {
            return {
                type: 'SQL_EXECUTION_ERROR',
                message: 'Database import failed: one or more values reference an ID that does not exist in the database.',
                detail: msg,
            };
        }

        if (code === '23502' || msg.includes('null value in column')) {
            return {
                type: 'SQL_EXECUTION_ERROR',
                message: 'Database import failed: one or more required fields are missing values.',
                detail: msg,
            };
        }

        if (code?.startsWith('22') || msg.includes('invalid input syntax') || msg.includes('out of range')) {
            return {
                type: 'SQL_EXECUTION_ERROR',
                message: 'Database import failed: one or more values have an invalid format or are out of range.',
                detail: msg,
            };
        }

        return {
            type: 'SQL_EXECUTION_ERROR',
            message: 'Database import failed: an unexpected error occurred.',
            detail: msg,
        };
    }
}

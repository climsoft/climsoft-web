import { AdapterLanguageEnum } from './adapter-language.enum';

/**
 * Per-language conventions for uploaded adapter zips. Mirrors the backend
 * constant of the same name — the backend enforces these at upload-preview
 * time; the front-end reads them to label files in the file-tree preview
 * and to display the canonical entry point in the adapter dialog.
 */
export interface AdapterLanguageConvention {
    /** Required declaration file at the root of the zip. */
    manifest: string;
    /** Canonical entry-point filename the runner executes. */
    entryPoint: string;
}

export const LANGUAGE_CONVENTIONS: Record<AdapterLanguageEnum, AdapterLanguageConvention> = {
    [AdapterLanguageEnum.PYTHON]:     { manifest: 'requirements.txt', entryPoint: 'main.py' },
    [AdapterLanguageEnum.R]:          { manifest: 'DESCRIPTION',      entryPoint: 'main.R' },
    [AdapterLanguageEnum.JAVASCRIPT]: { manifest: 'package.json',     entryPoint: 'index.js' },
    [AdapterLanguageEnum.SQL]:        { manifest: 'extensions.txt',   entryPoint: 'transform.sql' },
};

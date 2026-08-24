import { AdapterLanguageEnum } from './enums/adapter-language.enum';

/**
 * Per-language conventions for uploaded adapter zips. Every zip must
 * place both files at its ROOT (top-level, no directory prefix) — the
 * runner reads the entry point from the extracted script directory and
 * the manifest is detected by the extraction preview before save.
 *
 * Kept in a shared file (not the service or the runner) because both
 * `AdaptersService` (metadata) and `AdapterRunnerService` (shared) need
 * to agree on the mapping.
 */
export interface AdapterLanguageConvention {
    /**
     * Required declaration file at the root of the zip. Analogous across
     * languages: Python `requirements.txt`, R `DESCRIPTION`, JavaScript
     * `package.json`, SQL `extensions.txt`. Users declare top-level
     * dependencies; the runner resolves transitives at install time.
     *
     * Optional lockfiles (renv.lock, package-lock.json) may be shipped
     * alongside for deterministic installs but are not required — the
     * runner honors them when present.
     */
    manifest: string;

    /**
     * Canonical entry-point filename the runner executes. Users don't
     * choose this — it's a language convention so the runner never has
     * to guess. Matches the filenames shipped by the starter templates.
     */
    entryPoint: string;
}

export const LANGUAGE_CONVENTIONS: Record<AdapterLanguageEnum, AdapterLanguageConvention> = {
    [AdapterLanguageEnum.PYTHON]:     { manifest: 'requirements.txt', entryPoint: 'main.py' },
    [AdapterLanguageEnum.R]:          { manifest: 'DESCRIPTION',      entryPoint: 'main.R' },
    [AdapterLanguageEnum.JAVASCRIPT]: { manifest: 'package.json',     entryPoint: 'index.js' },
    [AdapterLanguageEnum.SQL]:        { manifest: 'extensions.txt',   entryPoint: 'transform.sql' },
};

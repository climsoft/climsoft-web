import { AdapterLanguageEnum } from './enums/adapter-language.enum';

/**
 * Language conventions for uploaded adapter zips. Every zip must place these
 * files at its ROOT (top-level, no directory prefix) — the runner reads the
 * entry point from the extracted script directory and the manifest is
 * detected by the extraction preview before save.
 *
 * Kept in a shared file (not the service or the runner) because both
 * `AdaptersService` (metadata) and `AdapterRunnerService` (shared) need to
 * agree on the mapping.
 */

/**
 * Manifest filenames accepted at the root of an uploaded zip, one entry per
 * language. Multiple values mean any one of them satisfies the check
 * (e.g. R adapters accept either `renv.lock` or `DESCRIPTION`).
 *
 * The API only checks existence; runners parse dependencies at first-run time.
 */
export const MANIFEST_FILENAMES: Record<AdapterLanguageEnum, string[]> = {
    [AdapterLanguageEnum.PYTHON]: ['requirements.txt'],
    [AdapterLanguageEnum.R]: ['renv.lock', 'DESCRIPTION'],
    [AdapterLanguageEnum.JAVASCRIPT]: ['package.json', 'package-lock.json'],
    [AdapterLanguageEnum.SQL]: ['extensions.txt'],
};

/**
 * Canonical entry-point filename required at the root of an uploaded zip, one
 * per language. Users don't choose this — the convention is enforced so the
 * runner always knows what to execute without a stored `entryPoint` field.
 *
 * Matches the filenames shipped by the starter templates.
 */
export const CANONICAL_ENTRY_POINT: Record<AdapterLanguageEnum, string> = {
    [AdapterLanguageEnum.PYTHON]: 'main.py',
    [AdapterLanguageEnum.R]: 'main.R',
    [AdapterLanguageEnum.JAVASCRIPT]: 'index.js',
    [AdapterLanguageEnum.SQL]: 'transform.sql',
};

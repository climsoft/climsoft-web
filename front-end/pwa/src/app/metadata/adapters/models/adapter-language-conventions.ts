import { AdapterLanguageEnum } from './adapter-language.enum';

/**
 * Canonical entry-point filename per language. Mirrors the backend constant
 * of the same name — the backend enforces this at upload-preview time; the
 * front-end reads it to show the user which file the runner will execute.
 */
export const CANONICAL_ENTRY_POINT: Record<AdapterLanguageEnum, string> = {
    [AdapterLanguageEnum.PYTHON]: 'main.py',
    [AdapterLanguageEnum.R]: 'main.R',
    [AdapterLanguageEnum.JAVASCRIPT]: 'index.js',
    [AdapterLanguageEnum.SQL]: 'transform.sql',
};

/**
 * Accepted manifest filenames per language. Mirrors the backend constant.
 * Used by the file tree preview to label which file in the extracted zip is
 * the dependency manifest for the selected language.
 *
 * Multiple entries mean any one of them counts (e.g. R accepts either
 * `renv.lock` or `DESCRIPTION`).
 */
export const MANIFEST_FILENAMES: Record<AdapterLanguageEnum, string[]> = {
    [AdapterLanguageEnum.PYTHON]: ['requirements.txt'],
    [AdapterLanguageEnum.R]: ['renv.lock', 'DESCRIPTION'],
    [AdapterLanguageEnum.JAVASCRIPT]: ['package.json', 'package-lock.json'],
    [AdapterLanguageEnum.SQL]: ['extensions.txt'],
};

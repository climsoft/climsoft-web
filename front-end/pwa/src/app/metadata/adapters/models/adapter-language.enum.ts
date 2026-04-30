/**
 * Languages supported by the adapter runner microservices. Mirrors the
 * enum on the backend (`back-end/api/src/metadata/adapters/enums/adapter-language.enum.ts`).
 */
export enum AdapterLanguageEnum {
    PYTHON = 'python',
    R = 'r',
    JAVASCRIPT = 'javascript',
    SQL = 'sql',
}

/**
 * Human-readable labels for each language, used in dropdown pickers and
 * list columns. Keeping the map here (rather than inline in components)
 * means any future relabelling is a one-file change.
 */
export const ADAPTER_LANGUAGE_LABELS: Record<AdapterLanguageEnum, string> = {
    [AdapterLanguageEnum.PYTHON]: 'Python',
    [AdapterLanguageEnum.R]: 'R',
    [AdapterLanguageEnum.JAVASCRIPT]: 'JavaScript',
    [AdapterLanguageEnum.SQL]: 'SQL (DuckDB)',
};

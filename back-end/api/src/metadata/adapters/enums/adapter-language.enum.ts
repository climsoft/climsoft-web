/**
 * Languages supported by the adapter runner microservices.
 *
 * Each value corresponds to one runner container (`climsoft_python_runner`,
 * `climsoft_r_runner`, `climsoft_node_runner`, `climsoft_duckdb_runner`).
 *
 * Adding a new language is a deliberate, rare event — these are the
 * scripting languages most commonly used in the climate sector. The
 * column on `adapter_specifications` is a Postgres enum, so adding a
 * value here requires a one-off migration.
 */
export enum AdapterLanguageEnum {
    PYTHON = 'python',
    R = 'r',
    JAVASCRIPT = 'javascript',
    SQL = 'sql',
}

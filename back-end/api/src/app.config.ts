/**
 * Reads a required env var, throwing immediately if it's unset or empty.
 * Used in place of a bare `!` assertion (which is a compile-time-only hint,
 * with no runtime effect) so a missing required var fails loudly, at module
 * load time — before Nest even starts bootstrapping — with a clear message,
 * instead of silently becoming `undefined` and surfacing later as a
 * confusing downstream error (e.g. a TypeORM connection failure with no
 * host, or a runner call to "undefined:5101").
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export class AppConfig {
  // Controls whether TypeORM auto-syncs the schema from entities (fresh
  // install) instead of relying on migrations. Every compose file sets this
  // explicitly (see docker-compose.*.yaml) — there is no dev-specific
  // default here any more.
  public static readonly firstInstall: boolean = requireEnv('FIRST_INSTALL') === 'yes';

  public static readonly dbCredentials = {
    // The database host is set in the docker-compose.*.yaml files, and is
    // required here. The other values are set in .env files, and are required
    // here too.
    host: requireEnv('DB_HOST'),
    port: 5432,
    username: 'postgres',
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
  };

  /**
   * Configuration for the adapter runner microservices. Each runner is
   * opt-in via its `enabled` flag.
   */
  public static readonly adapterRunners = {
    python: {
      enabled: process.env.PYTHON_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: requireEnv('PYTHON_RUNNER_HOST'),  // set in the docker-compose.*.yaml files not in .env file
      port: 5101,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    r: {
      enabled: process.env.R_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: requireEnv('R_RUNNER_HOST'),  // set in the docker-compose.*.yaml files not in .env file
      port: 5102,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    javascript: {
      enabled: process.env.JAVASCRIPT_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: requireEnv('JAVASCRIPT_RUNNER_HOST'),
      port: 5103,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    sql: { // Change this to duckdb. To be explicit about the engine used for SQL queries.
      enabled: process.env.DUCKDB_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: requireEnv('DUCKDB_RUNNER_HOST'), // set in the docker-compose.*.yaml files not in .env file
      port: 5104,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
  };

  // Used to encrypt connector passwords saved in the database
  // It should be atleast 32 chracters long
  public static readonly encryptionSecret: string = requireEnv('ENCRYPTION_SECRET');

  public static readonly superset = {
    enabled: process.env.SUPERSET_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
    host: requireEnv('SUPERSET_HOST'),  // set in the docker-compose.*.yaml files not in .env file
    port: 8088,
    serviceUsername: requireEnv('SUPERSET_SERVICE_USERNAME'),
    servicePassword: requireEnv('SUPERSET_SERVICE_PASSWORD'),
  };

  public static readonly v4DbCredentials = {
    v4Save: requireEnv('V4_SAVE') === 'yes',
    v4Import: requireEnv('V4_IMPORT') === 'yes',
    host: requireEnv('V4_DB_HOST'),
    port: +requireEnv('V4_DB_PORT'),
    username: requireEnv('V4_DB_USERNAME'),
    password: requireEnv('V4_DB_PASSWORD'),
    databaseName: requireEnv('V4_DB_NAME'),
    utcOffset: +requireEnv('V4_DB_UTCOFFSET'),
  };
}

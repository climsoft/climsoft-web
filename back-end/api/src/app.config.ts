export class AppConfig {
  // Controls whether TypeORM auto-syncs the schema from entities (fresh
  // install) instead of relying on migrations. Every compose file sets this
  // explicitly (see docker-compose.*.yaml) — there is no dev-specific
  // default here any more.
  public static readonly firstInstall: boolean = process.env.FIRST_INSTALL === 'yes';

  public static readonly dbCredentials = {
    // The database host is set in the docker-compose.*.yaml files, and is
    // required here. The other values are set in .env files, and are required
    // here too.
    host: process.env.DB_HOST!,
    port: 5432,
    username: 'postgres',
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  };

  /**
   * Configuration for the adapter runner microservices. Each runner is
   * opt-in via its `enabled` flag. 
   * value to require here.
   */
  public static readonly adapterRunners = {
    python: {
      enabled: process.env.PYTHON_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: process.env.PYTHON_RUNNER_HOST!,  // set in the docker-compose.*.yaml files not in .env file
      port: 5101,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    r: {
      enabled: process.env.R_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: process.env.R_RUNNER_HOST!,  // set in the docker-compose.*.yaml files not in .env file
      port: 5102,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    javascript: {
      enabled: process.env.JAVASCRIPT_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: process.env.JAVASCRIPT_RUNNER_HOST!,
      port: 5103,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
    sql: { // Change this to duckdb. To be explicit about the engine used for SQL queries.
      enabled: process.env.DUCKDB_RUNNER_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
      host: process.env.DUCKDB_RUNNER_HOST!, // set in the docker-compose.*.yaml files not in .env file
      port: 5104,
      timeoutSeconds: 300, // TODO. Deprecate this. The runner itself should have this for all queries, not the API. Should come from environment variable passed directly to runner.
    },
  };

  // Used to encrypt connector passwords saved in the database
  // It should be atleast 32 chracters long
  public static readonly encryptionSecret: string = process.env.ENCRYPTION_SECRET!;

  public static readonly superset = {
    enabled: process.env.SUPERSET_ENABLED === 'true', // TODO. deprecate this. The API can just 'ping' the runner or receive a connection timeout.
    host: process.env.SUPERSET_HOST!,  // set in the docker-compose.*.yaml files not in .env file
    port: 8088,
    serviceUsername: process.env.SUPERSET_SERVICE_USERNAME!,
    servicePassword: process.env.SUPERSET_SERVICE_PASSWORD!,
  };

  public static readonly v4DbCredentials = {
    v4Save: process.env.V4_SAVE === 'yes',
    v4Import: process.env.V4_IMPORT === 'yes',
    host: process.env.V4_DB_HOST!,
    port: +process.env.V4_DB_PORT!,
    username: process.env.V4_DB_USERNAME!,
    password: process.env.V4_DB_PASSWORD!,
    databaseName: process.env.V4_DB_NAME!,
    utcOffset: +process.env.V4_DB_UTCOFFSET!,
  };
}

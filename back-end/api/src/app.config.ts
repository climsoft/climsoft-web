export class AppConfig {
  // If first install has been defined, then the API is running in production mode. If not defined, it is runing in dev mode.
  // Everything else depends on whether API is in dev mode or not
  public static readonly devMode: boolean = process.env.FIRST_INSTALL ? false : true;

  public static readonly firstInstall: boolean = AppConfig.devMode ? true : (process.env.FIRST_INSTALL ? (process.env.FIRST_INSTALL === 'yes') : false);

  public static readonly dbCredentials = {
    host: process.env.DB_HOST ? process.env.DB_HOST : 'localhost',
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    username: process.env.DB_USERNAME ? process.env.DB_USERNAME : 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : 'my_password',
    database: process.env.DB_NAME ? process.env.DB_NAME : 'climsoft',
  };

  /**
   * Configuration for the adapter subsystem. Adapters are user-uploaded
   * scripts that translate foreign file formats to/from the canonical
   * format the existing import/export pipelines understand.
   *
   * Phase 1 only needs the upload size cap. Runner-related config
   * (per-language host/port, enabled flags) is added in Phase 2.
   */
  public static readonly adapters = {
    maxUploadSizeBytes: process.env.ADAPTERS_MAX_UPLOAD_BYTES ? +process.env.ADAPTERS_MAX_UPLOAD_BYTES : 10 * 1024 * 1024,
  };

  /**
   * Configuration for the adapter runner microservices. Each runner is
   * opt-in via its `enabled` flag. `timeoutSeconds` is per-runner (not
   * per-adapter) because it represents a deployment-level policy about
   * how long scripts in a given language are allowed to run.
   */
  public static readonly adapterRunners = {
    python: {
      enabled: AppConfig.devMode ? true: process.env.PYTHON_RUNNER_ENABLED === 'true',
      host: AppConfig.devMode ? 'localhost' : (process.env.PYTHON_RUNNER_HOST ?? 'climsoft_python_runner'),
      port: process.env.PYTHON_RUNNER_PORT ? +process.env.PYTHON_RUNNER_PORT : 5101,
      timeoutSeconds: process.env.PYTHON_RUNNER_TIMEOUT_SECONDS ? +process.env.PYTHON_RUNNER_TIMEOUT_SECONDS : 300,
    },
    r: {
      enabled:AppConfig.devMode ? true: process.env.R_RUNNER_ENABLED === 'true',
      host: AppConfig.devMode ? 'localhost' : (process.env.R_RUNNER_HOST ?? 'climsoft_r_runner'),
      port: process.env.R_RUNNER_PORT ? +process.env.R_RUNNER_PORT : 5102,
      timeoutSeconds: process.env.R_RUNNER_TIMEOUT_SECONDS ? +process.env.R_RUNNER_TIMEOUT_SECONDS : 300,
    },
    javascript: {
      enabled: AppConfig.devMode ? true: process.env.JAVASCRIPT_RUNNER_ENABLED === 'true',
      host: AppConfig.devMode ? 'localhost'  : (process.env.JAVASCRIPT_RUNNER_HOST ?? 'climsoft_javascript_runner'),
      port: process.env.JAVASCRIPT_RUNNER_PORT ? +process.env.JAVASCRIPT_RUNNER_PORT : 5103,
      timeoutSeconds: process.env.JAVASCRIPT_RUNNER_TIMEOUT_SECONDS ? +process.env.JAVASCRIPT_RUNNER_TIMEOUT_SECONDS : 300,
    },
    sql: {
      enabled: AppConfig.devMode ? true: process.env.DUCKDB_RUNNER_ENABLED === 'true',
      host: AppConfig.devMode  ? 'localhost'  : (process.env.DUCKDB_RUNNER_HOST ?? 'climsoft_duckdb_runner'),
      port: process.env.DUCKDB_RUNNER_PORT ? +process.env.DUCKDB_RUNNER_PORT : 5104,
      timeoutSeconds: process.env.DUCKDB_RUNNER_TIMEOUT_SECONDS ? +process.env.DUCKDB_RUNNER_TIMEOUT_SECONDS : 300,
    },
  };

  // Used to encrypt connector passwords saved in the database
  // It should be atleast 32 chracters long
  public static readonly encryptionSecret: string = AppConfig.devMode ? '0123456789012345678901234567890123456789' : (process.env.ENCRYPTION_SECRET ? process.env.ENCRYPTION_SECRET : '');

  public static readonly v4DbCredentials = {
    v4Save: AppConfig.devMode ? true : (process.env.V4_SAVE ? (process.env.V4_SAVE === 'yes') : false),
    v4Import: AppConfig.devMode ? true : (process.env.V4_IMPORT ? (process.env.V4_IMPORT === 'yes') : false),
    host: AppConfig.devMode ? 'localhost' : (process.env.V4_DB_HOST ? process.env.V4_DB_HOST : 'host.docker.internal'),
    port: process.env.V4_DB_PORT ? +process.env.V4_DB_PORT : 3308,
    username: process.env.V4_DB_USERNAME ? process.env.V4_DB_USERNAME : 'my_user',
    password: process.env.V4_DB_PASSWORD ? process.env.V4_DB_PASSWORD : 'my_password',
    databaseName: process.env.V4_DB_NAME ? process.env.V4_DB_NAME : 'mariadb_climsoft_db_v4',
    utcOffset: process.env.V4_DB_UTCOFFSET ? +process.env.V4_DB_UTCOFFSET : 0,
  };
}

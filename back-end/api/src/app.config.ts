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

   public static readonly csv2BufrCredentials = {
    host: AppConfig.devMode ? 'localhost': (process.env.CSV2BUFR_HOST ? process.env.CSV2BUFR_HOST : 'climsoft_csv2bufr'),
    port:  AppConfig.devMode ? 5001: (process.env.CSV2BUFR_PORT ? +process.env.CSV2BUFR_PORT  : 5001)
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

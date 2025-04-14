export class AppConfig {
  public static readonly devMode: boolean = false;

  public static readonly dbCredentials = {
    host: process.env.DB_HOST ? process.env.DB_HOST : 'localhost',
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    username: process.env.DB_USERNAME ? process.env.DB_USERNAME : 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : 'my_password',
    database: process.env.DB_NAME ? process.env.DB_NAME : 'climsoft',
  }

  public static readonly v4DbCredentials = {
    v4Save: process.env.V4_SAVE ? (process.env.V4_SAVE === 'yes') : false,
    host: process.env.V4_DB_HOST ? process.env.V4_DB_HOST : 'host.docker.internal', 
    port: process.env.V4_DB_PORT ? +process.env.V4_DB_PORT : 3306,
    username: process.env.V4_DB_USERNAME ? process.env.V4_DB_USERNAME : 'my_user',
    password: process.env.V4_DB_PASSWORD ? process.env.V4_DB_PASSWORD : 'my_password',
    databaseName: process.env.V4_DB_NAME ? process.env.V4_DB_NAME : 'mariadb_climsoft_db_v4',
    utcOffset: process.env.V4_DB_UTCOFFSET ? +process.env.V4_DB_UTCOFFSET : 0,  
  }
}


import { SeedElementSubdomains1710833102997 } from "src/migrations/1710833102997-SeedElementSubdomains";
import { SeedElementTypes1710833156699 } from "src/migrations/1710833156699-SeedElementTypes";
import { SeedElements1710833167092 } from "src/migrations/1710833167092-SeedElements";
import { SeedObservationEnvironments1711195885141 } from "src/migrations/1711195885141-SeedObservationEnvironments";
import { SeedObservationFocuses1711196308488 } from "src/migrations/1711196308488-SeedObservationFocuses";
import { DataSource } from "typeorm";

// Tto run execute the migrations, run; npx typeorm migration:run -d dist/typeorm.config.js
// This should be done after building the application and when the database already exists.
// To revert the migrations, run: typeorm migration:revert -d dist/typeorm.config.js
// If you need to revert multiple migrations you must call this command multiple times.
// See https://typeorm.io/migrations for more explanations.

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ? process.env.DB_HOST : "localhost",
  port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
  username: process.env.DB_USERNAME ? process.env.DB_USERNAME : "postgres",
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : "password",
  database: process.env.DB_NAME ? process.env.DB_NAME : "climsoft",
  entities: [],
  migrations: [
    SeedElementSubdomains1710833102997, 
    SeedElementTypes1710833156699, 
    SeedElements1710833167092,
    SeedObservationEnvironments1711195885141,
    SeedObservationFocuses1711196308488,
  ],
});
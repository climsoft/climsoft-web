
/**
 * To create this migration just execute;
 * npx typeorm migration:create src/migrations/SeedObservationFocuses
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedObservationFocuses1711196308488 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(SeedObservationFocuses1711196308488.INSERT_STATION_OBSERVATION_FOCUSES);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM station_observation_focuses")
    } 

    public static INSERT_STATION_OBSERVATION_FOCUSES = `
    INSERT INTO station_observation_focuses (id, name, description, entry_user_id) VALUES 
    (1, 'Agricultural meteorological station','', 1),
    (2, 'Aircraft meteorological station','', 1),
    (3, 'Climatological station','', 1),
    (4, 'Cryosphere station','', 1),
    (5, 'Precipitation station','', 1),
    (6, 'Radiation station','', 1),
    (7, 'Sea profiling station' ,'', 1),
    (8, 'Space weather station','', 1),
    (9, 'Surface land meteorological station (SYNOP)' ,'', 1),
    (10, 'Surface marine meteorological station','', 1),
    (11, 'Upper-air / Radiosonde station' ,'', 1),
    (12, 'Radar station','', 1)
    `;



}

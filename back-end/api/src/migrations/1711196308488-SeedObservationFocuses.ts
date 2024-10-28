
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
    INSERT INTO station_observation_focuses (id, name, description) VALUES 
    (1, 'Agricultural meteorological station',''),
    (2, 'Aircraft meteorological station',''),
    (3, 'Climatological station',''),
    (4, 'Cryosphere station',''),
    (5, 'Precipitation station',''),
    (6, 'Radiation station',''),
    (7, 'Sea profiling station' ,''),
    (8, 'Space weather station',''),
    (9, 'Surface land meteorological station (SYNOP)' ,''),
    (10, 'Surface marine meteorological station',''),
    (11, 'Upper-air / Radiosonde station' ,''),
    (12, 'Radar station','' )
    `;



}

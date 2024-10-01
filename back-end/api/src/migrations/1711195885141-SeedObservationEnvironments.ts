
/**
 * To create this migration just execute;
 * npx typeorm migration:create src/migrations/SeedObservationEnvironments
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedObservationEnvironments1711195885141 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(SeedObservationEnvironments1711195885141.INSERT_STATION_OBSERVATION_ENVIRONMENTS);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM station_observation_environments")
    }

    public static INSERT_STATION_OBSERVATION_ENVIRONMENTS = `
    INSERT INTO station_observation_environments (id, name, description) VALUES 

    (1, 'Air (fixed)', ''),
    (2, 'Air (mobile)', ''),

    (3, 'Lake/River (fixed)', ''),
    (4, 'Lake/River (mobile)', ''),

    (5, 'Land (fixed)', ''),
    (6, 'Land (mobile)', ''),
    (7, 'Land (on ice)' , ''),

    (8, 'Sea (fixed)', ''),
    (9, 'Sea (mobile)', '' ),
    (10, 'Sea (on ice)', ''),

    (11, 'Underwater (fixed)', '' ),
    (12, 'Underwater (mobile)', '')

    `;

}

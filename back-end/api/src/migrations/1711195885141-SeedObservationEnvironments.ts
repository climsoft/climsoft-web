
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
    INSERT INTO station_observation_environments (id, name, description, entry_user_id) VALUES 

    (1, 'Air (fixed)', '', 1),
    (2, 'Air (mobile)', '', 1),

    (3, 'Lake/River (fixed)', '', 1),
    (4, 'Lake/River (mobile)', '', 1),

    (5, 'Land (fixed)', '', 1),
    (6, 'Land (mobile)', '', 1),
    (7, 'Land (on ice)' , '', 1),

    (8, 'Sea (fixed)', '', 1),
    (9, 'Sea (mobile)', '' , 1),
    (10, 'Sea (on ice)', '', 1),

    (11, 'Underwater (fixed)', '', 1),
    (12, 'Underwater (mobile)', '', 1)

    `;

}

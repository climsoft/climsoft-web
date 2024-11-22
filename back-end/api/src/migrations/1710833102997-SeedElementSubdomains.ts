import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElementSubdomains

export class SeedElementSubdomains1710833102997 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(SeedElementSubdomains1710833102997.INSERT_ELEMENT_SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM element_subdomains")
    }

    public static INSERT_ELEMENT_SQL = `
    INSERT INTO element_subdomains (id, name, description, domain, entry_user_id) VALUES 
    (1, 'Surface', '', 'atmosphere', 1),
    (2, 'Upper-air', '', 'atmosphere', 1),
    (3, 'Atmospheric Composition', '', 'atmosphere', 1)

    `;

    // TODO
    // (4, 'Hydrosphere', '', 'land'),
    // (5, 'Cryosphere', '', 'land'),
    // (6, 'Biosphere', '', 'land'),
    // (7, 'Anthroposphere', '', 'land'),

    // (8, 'Physical', '', 'ocean'),
    // (9, 'Biogeochemical', '', 'ocean'),
    // (10, 'Biological/ecosystems', '', 'ocean')

}

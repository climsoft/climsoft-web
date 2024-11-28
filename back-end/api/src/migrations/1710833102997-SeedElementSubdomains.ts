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
    (3, 'Atmospheric Composition', '', 'atmosphere', 1),
    (4, 'Hydrosphere', '', 'land', 1),
    (5, 'Cryosphere', '', 'land', 1),
    (6, 'Biosphere', '', 'land', 1),
    (7, 'Anthroposphere', '', 'land', 1),
    (8, 'Physical', '', 'ocean', 1),
    (9, 'Biogeochemical', '', 'ocean', 1),
    (10, 'Biological/ecosystems', '', 'ocean', 1)
    `;   

}

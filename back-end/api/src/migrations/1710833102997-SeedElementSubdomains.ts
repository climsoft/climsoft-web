import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElementSubdomains

export class SeedElementSubdomains1710833102997 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const sql = `
        INSERT INTO element_subdomains (id, name,description, domain) VALUES 
        
        (1, 'Surface', '', 'atmosphere' ),
        (2, 'Upper-air', '', 'atmosphere'),
        (3, 'Atmospheric Composition', '', 'atmosphere'),

        (4, 'Hydrosphere', '', 'land'),
        (5, 'Cryosphere', '', 'land'),
        (6, 'Biosphere', '', 'land'),
        (7, 'Anthroposphere', '', 'land'),

        (8, 'Physical', '', 'ocean'),
        (9, 'Biogeochemical', '', 'ocean'),
        (10, 'Biological/ecosystems', '', 'ocean')
        `;

        await queryRunner.query(sql);

    }

    public async down(queryRunner: QueryRunner): Promise<void> { 
        await queryRunner.query("DELETE FROM element_subdomains")
    }

}

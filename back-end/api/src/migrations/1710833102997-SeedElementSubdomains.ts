import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElementSubdomains

export class SeedElementSubdomains1710833102997 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const sql = `
        INSERT INTO element_subdomains (id, name, domain) VALUES 
        
        (1, 'Surface', 'Atmosphere' ),
        (2, 'Upper-air', 'Atmosphere'),
        (3, 'Atmospheric Composition', 'Atmosphere'),

        (4, 'Hydrosphere', 'Land'),
        (5, 'Cryosphere', 'Land'),
        (6, 'Biosphere', 'Land'),
        (7, 'Anthroposphere', 'Land'),

        (8, 'Physical', 'Ocean'),
        (9, 'Biogeochemical', 'Ocean'),
        (10, 'Biological/ecosystems', 'Ocean')
        `;

        await queryRunner.query(sql);

    }

    public async down(queryRunner: QueryRunner): Promise<void> { 
        await queryRunner.query("DELETE FROM element_subdomains")
    }

}

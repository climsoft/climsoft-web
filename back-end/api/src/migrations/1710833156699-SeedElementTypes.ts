import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElementTypes

export class SeedElementTypes1710833156699 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(SeedElementTypes1710833156699.INSERT_ELEMENT_TYPES);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM element_types")
    }

    public static INSERT_ELEMENT_TYPES = `
    INSERT INTO element_types (id, name, description, subdomain_id, entry_user_id) VALUES 

    (1, 'Precipitation', '', 1, 1),
    (2, 'Pressure', '', 1, 1),
    (3, 'Radiation budget', '', 1, 1),
    (4, 'Temperature', '', 1, 1),
    (5, 'Water vapour', '', 1, 1),
    (6, 'Wind speed and direction', '', 1, 1),

    (7, 'Earth radiation budget', '', 2, 1),
    (8, 'Lightning', '', 2, 1),
    (9, 'Temperature', '', 2, 1),
    (11, 'Water vapor', '', 2, 1),
    (12, 'Wind speed and direction', '', 2, 1),
    (13, 'Clouds', '', 2, 1),

    (14, 'Aerosols', '', 3, 1),
    (15, 'Carbon dioxide, methane and other greenhouse gases', '', 3, 1),
    (16, 'Ozone', '', 3, 1),
    (17, 'Precursors for aerosols and ozone', '', 3, 1),

    (18, 'Groundwater', '', 4, 1),
    (19, 'Lakes', '', 4, 1),
    (20, 'River discharge', '', 4, 1),
    (21, 'Terrestrial water storage', '', 4, 1),

    `;

}

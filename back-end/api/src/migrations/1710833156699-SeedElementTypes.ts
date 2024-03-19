import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElementTypes

export class SeedElementTypes1710833156699 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const sql = `
        INSERT INTO element_types (id, name, subdomain_id) VALUES 

        (1, 'Precipitation', 1 ),
        (2, 'Pressure', 1),
        (3, 'Radiation budget', 1),
        (4, 'Temperature', 1),
        (5, 'Water vapour', 1),
        (6, 'Wind speed and direction', 1),

        (7, 'Earth radiation budget', 2),
        (8, 'Lightning', 2),
        (9, 'Temperature', 2),
        (11, 'Water vapor', 2),
        (12, 'Wind speed and direction', 2),
        (13, 'Clouds', 2),

        (14, 'Aerosols', 3),
        (15, 'Carbon dioxide, methane and other greenhouse gases', 3),
        (16, 'Ozone', 3),
        (17, 'Precursors for aerosols and ozone', 3)

        `;

        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM element_types")
    }

}

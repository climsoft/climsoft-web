import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/SeedElements

export class SeedElements1710833167092 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const sql = `
        INSERT INTO elements (id, abbreviation, name, description, units, type_id) VALUES 

        (1, 'PRECIP', 'Precipitation Total', '', 'Millimiters', 1 ),
        (2, 'PRECIPX', 'Precipitation Greatest Amount', '', 'Millimiters', 1 ),

        (3, 'PRESSST', 'Pressure Station Daily Average', '', '', 2 ),
        (4, 'PRESSSL', 'Pressure Sea Level Average', '', '', 2 ),

        (5, 'SUNSHN', 'Sunshine Total', '', 'Minutes', 3 ),
        (6, 'RADGLS', 'Radiation Global Solar', '', 'Megajoules/M**2', 3 ),
        (7, 'RADSKY', 'Radiation Sky', '', 'Megajoules/M**2', 3 ),

        (8, 'TMPMAX', 'Maximum Temperature', '', 'Degree Celcius', 4 ),
        (9, 'TMPMIN', 'Minimum Temperature', '', 'Degree Celcius', 4 ),
        (10, 'TMPMEAN', 'Mean Temperature', '', 'Degree Celcius', 4 ),
        (11, 'TMPDB', 'Temperature Dry Bulb', '', 'Degree Celcius', 4 ),
        (12, 'TMPWB', 'Temperature Wet Bulb', '', 'Degree Celcius', 4 ),

        (13, 'RHMAX', 'Maximum Relative Humidity', '', 'Percent', 5 ),
        (14, 'RHMIN', 'Minimum Relative Humidity', '', 'Percent', 5 ),
        (15, 'EVAPPN1', 'Evaporation Pan 1', '', 'Millimiters', 5 ),
        (16, 'VAPPRESS', 'Vapour Pressure', '', 'Kpa', 5 ),

        (17, 'WNDSPAVG', 'Wind Speed Average', '', 'Meters/Second', 6),
        (18, 'PKGUST', 'Wind Gust Speed Maximum', '', 'Meters/Second', 6),
        (19, 'PKGSTD', 'Wind Gust Direction', '', 'Tens of Degrees', 6),

        (20, 'CLDTOT', 'Cloud Cover Total', '', 'Octas', 13),
        (21, 'CLDOPC', 'Cloud Opacity Total', '', 'Octas', 13)

        `;

        await queryRunner.query(sql);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM elements")
     }

}

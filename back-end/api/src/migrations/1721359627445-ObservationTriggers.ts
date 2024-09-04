import { MigrationInterface, QueryRunner } from "typeorm";

// To create this migration just execute; npx typeorm migration:create src/migrations/ObservationTriggers

export class ObservationTriggers1721359627445 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        const sql = `
        CREATE OR REPLACE FUNCTION function_observations_update_log_column()
        RETURNS TRIGGER AS $$
        BEGIN
        IF (
            NEW.value IS DISTINCT FROM OLD.value OR 
            NEW.flag IS DISTINCT FROM OLD.flag OR 
            NEW.final IS DISTINCT FROM OLD.final OR 
            NEW.comment IS DISTINCT FROM OLD.comment OR 
            NEW.deleted IS DISTINCT FROM OLD.deleted
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'value', OLD.value,
            'flag', OLD.flag,
            'final', OLD.final,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id,
            'deleted', OLD.deleted,
            'entryDateTime', CURRENT_TIMESTAMP
        );
        END IF;
        RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;


        CREATE OR REPLACE TRIGGER trigger_observations_update_log_column
        BEFORE UPDATE ON observations
        FOR EACH row
        EXECUTE FUNCTION function_observations_update_log_column();
        `

        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const sql =`
        DROP TRIGGER trigger_observations_update_log_column;

        DROP FUNCTION function_observations_update_log_column;
        `
        await queryRunner.query(sql)
    }

}

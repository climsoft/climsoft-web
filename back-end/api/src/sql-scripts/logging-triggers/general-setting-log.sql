CREATE OR REPLACE FUNCTION func_update_general_settings_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.parameters IS DISTINCT FROM OLD.parameters OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'parameters', OLD.parameters,
            'comment', OLD.comment,
			'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_general_settings_log
BEFORE UPDATE ON general_settings
FOR EACH row
EXECUTE FUNCTION func_update_general_settings_log();
CREATE OR REPLACE FUNCTION func_update_adapter_specifications_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
            NEW.name IS DISTINCT FROM OLD.name OR
            NEW.description IS DISTINCT FROM OLD.description OR
            NEW.script_dir_name IS DISTINCT FROM OLD.script_dir_name OR
            NEW.entry_point IS DISTINCT FROM OLD.entry_point OR
            NEW.disabled IS DISTINCT FROM OLD.disabled OR
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'script_dir_name', OLD.script_dir_name,
            'entry_point', OLD.entry_point,
            'disabled', OLD.disabled,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id,
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_adapter_specifications_log
BEFORE UPDATE ON adapter_specifications
FOR EACH row
EXECUTE FUNCTION func_update_adapter_specifications_log();

CREATE OR REPLACE FUNCTION func_update_export_specifications_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.export_type IS DISTINCT FROM OLD.export_type OR 
            NEW.parameters IS DISTINCT FROM OLD.parameters OR 
            NEW.disabled IS DISTINCT FROM OLD.disabled OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'export_type', OLD.export_type,
            'parameters', OLD.parameters,
            'disabled', OLD.disabled,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_export_specifications_log
BEFORE UPDATE ON export_specifications
FOR EACH row
EXECUTE FUNCTION func_update_export_templates_log();
CREATE OR REPLACE FUNCTION func_update_organisations_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.extra_metadata IS DISTINCT FROM OLD.extra_metadata OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'extra_metadata', OLD.extra_metadata,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_organisations_log
BEFORE UPDATE ON organisations
FOR EACH row
EXECUTE FUNCTION func_update_organisations_log();
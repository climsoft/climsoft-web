CREATE OR REPLACE FUNCTION func_update_elements_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
            NEW.abbreviation IS DISTINCT FROM OLD.abbreviation OR 
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.units IS DISTINCT FROM OLD.units OR 
            NEW.type_id IS DISTINCT FROM OLD.type_id OR 
            NEW.entry_scale_factor IS DISTINCT FROM OLD.entry_scale_factor OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'abbreviation', OLD.abbreviation,
            'name', OLD.name,
            'description', OLD.description,
            'units', OLD.units,
            'type_id', OLD.type_id,
            'entry_scale_factor', OLD.entry_scale_factor,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_elements_log
BEFORE UPDATE ON elements
FOR EACH row
EXECUTE FUNCTION func_update_elements_log();
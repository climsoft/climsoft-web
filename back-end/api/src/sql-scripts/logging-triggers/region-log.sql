CREATE OR REPLACE FUNCTION func_update_regions_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.region_type IS DISTINCT FROM OLD.region_type OR 
            NEW.boundary IS DISTINCT FROM OLD.boundary OR 
            NEW.color IS DISTINCT FROM OLD.color OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'region_type', OLD.region_type,
            'boundary', OLD.boundary,
            'color', OLD.color,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_regions_log
BEFORE UPDATE ON regions
FOR EACH row
EXECUTE FUNCTION func_update_regions_log();
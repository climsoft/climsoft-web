CREATE OR REPLACE FUNCTION func_update_source_templates_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR 
            NEW.source_type IS DISTINCT FROM OLD.source_type OR 
            NEW.utc_offset IS DISTINCT FROM OLD.utc_offset OR 
            NEW.allow_missing_value IS DISTINCT FROM OLD.allow_missing_value OR 
            NEW.scale_values IS DISTINCT FROM OLD.scale_values OR 
            NEW.parameters IS DISTINCT FROM OLD.parameters OR 
            NEW.sample_image IS DISTINCT FROM OLD.sample_image OR 
            NEW.disabled IS DISTINCT FROM OLD.disabled OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
        IF(OLD.name = 'climsoft_v4') THEN
         RETURN NEW;
        END IF;
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'utc_offset', OLD.utc_offset,
            'allow_missing_value', OLD.allow_missing_value,
            'scale_values', OLD.scale_values,
            'parameters', OLD.parameters,
            'sample_image', OLD.sample_image,
            'disabled', OLD.disabled,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_source_templates_log
BEFORE UPDATE ON source_templates
FOR EACH row
EXECUTE FUNCTION func_update_source_templates_log();
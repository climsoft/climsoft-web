CREATE OR REPLACE FUNCTION func_update_climate_products_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
            NEW.superset_uuid IS DISTINCT FROM OLD.superset_uuid OR
            NEW.name IS DISTINCT FROM OLD.name OR
            NEW.description IS DISTINCT FROM OLD.description OR
            NEW.category IS DISTINCT FROM OLD.category OR
            NEW.disabled IS DISTINCT FROM OLD.disabled
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'superset_uuid', OLD.superset_uuid,
            'name', OLD.name,
            'description', OLD.description,
            'category', OLD.category,
            'disabled', OLD.disabled,
            'entryUserId', OLD.entry_user_id,
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_climate_products_log
BEFORE UPDATE ON climate_products
FOR EACH row
EXECUTE FUNCTION func_update_climate_products_log();

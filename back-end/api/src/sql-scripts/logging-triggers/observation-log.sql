CREATE OR REPLACE FUNCTION func_update_observations_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
            NEW.value IS DISTINCT FROM OLD.value OR 
            NEW.flag IS DISTINCT FROM OLD.flag OR 
            NEW.qc_status IS DISTINCT FROM OLD.qc_status OR 
            NEW.comment IS DISTINCT FROM OLD.comment OR             
            NEW.deleted IS DISTINCT FROM OLD.deleted
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'value', OLD.value,
            'flag', OLD.flag,
            'qcStatus', OLD.qc_status,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id,
            'deleted', OLD.deleted,
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_observations_log
BEFORE UPDATE ON observations
FOR EACH row
EXECUTE FUNCTION func_update_observations_log();

CREATE OR REPLACE FUNCTION func_update_observations_log()
RETURNS TRIGGER AS $$
DECLARE
    log_entry JSONB;
BEGIN
    -- Track data column changes (existing behavior)
    IF (
        NEW.value IS DISTINCT FROM OLD.value OR
        NEW.flag_id IS DISTINCT FROM OLD.flag_id OR
        NEW.qc_status IS DISTINCT FROM OLD.qc_status OR
        NEW.comment IS DISTINCT FROM OLD.comment OR
        NEW.deleted IS DISTINCT FROM OLD.deleted
    ) THEN
        log_entry := jsonb_build_object(
            'value', OLD.value,
            'flagId', OLD.flag_id,
            'qcStatus', OLD.qc_status,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id,
            'deleted', OLD.deleted,
            'entryDateTime', OLD.entry_date_time
        );
        NEW.log := COALESCE(OLD.log, '[]'::JSONB) || log_entry;
    END IF;

    -- Track PK column changes
    IF (
        NEW.station_id IS DISTINCT FROM OLD.station_id OR
        NEW.element_id IS DISTINCT FROM OLD.element_id OR
        NEW.level IS DISTINCT FROM OLD.level OR
        NEW.date_time IS DISTINCT FROM OLD.date_time OR
        NEW.interval IS DISTINCT FROM OLD.interval OR
        NEW.source_id IS DISTINCT FROM OLD.source_id
    ) THEN
        log_entry := jsonb_build_object(
            'value', OLD.value,
            'flagId', OLD.flag_id,
            'qcStatus', OLD.qc_status,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id,
            'deleted', OLD.deleted,
            'entryDateTime', OLD.entry_date_time,
            'pkChange', jsonb_build_object(
                'oldStationId', OLD.station_id,
                'oldElementId', OLD.element_id,
                'oldLevel', OLD.level,
                'oldDateTime', OLD.date_time,
                'oldInterval', OLD.interval,
                'oldSourceId', OLD.source_id
            )
        );
        NEW.log := COALESCE(OLD.log, '[]'::JSONB) || log_entry;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_observations_log
BEFORE UPDATE ON observations
FOR EACH row
EXECUTE FUNCTION func_update_observations_log();

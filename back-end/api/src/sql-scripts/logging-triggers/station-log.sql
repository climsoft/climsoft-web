CREATE OR REPLACE FUNCTION func_update_stations_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
            NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.description IS DISTINCT FROM OLD.description OR
            NEW.location IS DISTINCT FROM OLD.location OR 
            NEW.elevation IS DISTINCT FROM OLD.elevation OR 
            NEW.observation_processing_method IS DISTINCT FROM OLD.observation_processing_method OR 
            NEW.observation_environment_id IS DISTINCT FROM OLD.observation_environment_id OR 
            NEW.observation_focus_id IS DISTINCT FROM OLD.observation_focus_id OR 
            NEW.organisation_id IS DISTINCT FROM OLD.organisation_id OR
            NEW.wmo_id IS DISTINCT FROM OLD.wmo_id OR 
            NEW.wigos_id IS DISTINCT FROM OLD.wigos_id OR 
            NEW.icao_id IS DISTINCT FROM OLD.icao_id OR 
            NEW.status IS DISTINCT FROM OLD.status OR 
            NEW.date_established IS DISTINCT FROM OLD.date_established OR 
            NEW.date_closed IS DISTINCT FROM OLD.date_closed OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'description', OLD.description,
            'location', OLD.location,
            'elevation', OLD.elevation,
            'observation_processing_method', OLD.observation_processing_method,
            'observation_environment_id', OLD.observation_environment_id,
            'observation_focus_id', OLD.observation_focus_id,
            'organisation_id', OLD.organisation_id,
            'wmo_id', OLD.wmo_id,
            'icao_id', OLD.icao_id,
            'status', OLD.status,
            'date_established', OLD.date_established,
            'date_closed', OLD.date_closed,
            'comment', OLD.comment,
            'entryUserId', OLD.entry_user_id, 
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_stations_log
BEFORE UPDATE ON stations
FOR EACH row
EXECUTE FUNCTION func_update_stations_log();
-- TODO optimise below function
CREATE OR REPLACE FUNCTION func_after_delete_update_observations_final_column()
RETURNS TRIGGER AS $$
BEGIN
	-- If the deleted observation was not final, no need to continue with further execeution
	IF OLD.final = FALSE THEN
		RETURN OLD;
	END IF;

	-- check how many similar observations are there. 
    SELECT COUNT(*) INTO same_observations FROM observations
				WHERE station_id = NEW.station_id 
        		AND element_id = NEW.element_id
        		AND elevation = NEW.elevation
        		AND date_time = NEW.date_time
        		AND period = NEW.period
        		AND deleted = FALSE;

	-- If there is only one observation left, then mark the left observation as final.
	IF same_observations = 1 THEN
		UPDATE observations SET final = TRUE
							WHERE station_id = NEW.station_id 
        					AND element_id = NEW.element_id
        					AND elevation = NEW.elevation
        					AND date_time = NEW.date_time
        					AND period = NEW.period
        					AND deleted = FALSE;
	END IF;

RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_after_delete_update_observations_final_column
AFTER DELETE ON observations
FOR EACH row
EXECUTE FUNCTION func_after_delete_update_observations_final_column();
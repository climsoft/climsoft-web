-- TODO optimise below function
CREATE OR REPLACE FUNCTION func_before_insert_update_observations_final_column()
RETURNS TRIGGER AS $$
DECLARE
	same_values_found BOOL;
	diff_values_found BOOL;
BEGIN
	same_values_found := FALSE;
	diff_values_found := FALSE;

    -- Loop through all similar observations that are not deleted
    FOR same_observation IN
        SELECT * FROM observations
				WHERE station_id = NEW.station_id 
        		AND element_id = NEW.element_id
        		AND elevation = NEW.elevation
        		AND date_time = NEW.date_time
        		AND period = NEW.period
        		AND deleted = FALSE
    LOOP
        BEGIN
			IF same_observation.value = NEW.value AND same_observation.flag = NEW.flag THEN
				same_values_found := TRUE;
			ElSE IF same_observation.value <> NEW.value OR same_observation.flag <> NEW.flag THEN
				diff_values_found := TRUE;
			END IF;
        END;
    END LOOP;

	-- If there are values that are different from this new record then make all observations as not final
	IF diff_values_found THEN
		UPDATE observations SET final = FALSE
							WHERE station_id = NEW.station_id 
        					AND element_id = NEW.element_id
        					AND elevation = NEW.elevation
        					AND date_time = NEW.date_time
        					AND period = NEW.period
        					AND deleted = FALSE
							AND final = TRUE;
		NEW.final = FALSE;
	ELSE IF same_values_found THEN
		-- If there are existing same values then this record cannot be final because it already exists in the database 
		NEW.final = FALSE;
	END IF;

 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_before_insert_update_observations_final_column
BEFORE INSERT ON observations
FOR EACH row
EXECUTE FUNCTION func_before_insert_update_observations_final_column();
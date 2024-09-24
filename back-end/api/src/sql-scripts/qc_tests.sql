--- qc record function
CREATE OR REPLACE FUNCTION func_execute_qc_tests(
    observation_record RECORD
) RETURNS JSONB AS $$
DECLARE
    qc_test RECORD;
    qc_fail_log JSONB;
    all_qc_fails_log JSONB := '[]'::JSONB; -- Initialize as empty JSON array
BEGIN
    -- Check if the observation value is NULL
    IF observation_record.value IS NULL THEN
        RETURN NULL;
    END IF;

    -- Loop through all relevant QC tests for the observation
    FOR qc_test IN
        SELECT * 
        FROM quality_control_tests 
        WHERE element_id = observation_record.element_id
			AND disabled = FALSE
			AND observation_period = observation_record.period
    LOOP
        BEGIN
            -- Determine which QC test to perform based on the qc_test_type
            CASE qc_test.qc_test_type
                WHEN 'range_threshold' THEN
                    qc_fail_log := func_perform_range_threshold_test(observation_record, qc_test);
                WHEN 'repeated_value' THEN
                    qc_fail_log := func_perform_repeated_value_test(observation_record, qc_test);
                WHEN 'flat_line' THEN
                    qc_fail_log := func_perform_flat_line_test(observation_record, qc_test);
                WHEN 'spike' THEN
                    qc_fail_log := func_perform_spike_test(observation_record, qc_test);
                WHEN 'relational_comparison' THEN
                    qc_fail_log := func_perform_relational_comparison_test(observation_record, qc_test);

                -- Add other QC test cases here, like contextual_consistency, spatial, etc.
            END CASE;

            -- If a fail_log was returned, update all_qc_fails_log 
            IF qc_fail_log IS NOT NULL THEN
                all_qc_fails_log := all_qc_fails_log || qc_fail_log;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Handle or log the error; continue with next test
                -- Optionally log the error
                RAISE NOTICE 'Error in QC test execution: %', SQLERRM;
        END;
    END LOOP;

    -- Return null if there are no QC fails
    IF all_qc_fails_log = '[]'::JSONB THEN
        RETURN NULL;
    ELSE
        RETURN all_qc_fails_log;
    END IF;
END;
$$ LANGUAGE plpgsql;


--- Range threshold ---
CREATE OR REPLACE FUNCTION func_perform_range_threshold_test(
    observation_value FLOAT8,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    lower_threshold FLOAT8;
    upper_threshold FLOAT8;
    fail_log JSONB;
BEGIN
    -- Decode the JSON parameters to extract lower and upper limits
    lower_threshold := (qc_test.parameters->>'lowerThreshold')::FLOAT8;
    upper_threshold := (qc_test.parameters->>'upperThreshold')::FLOAT8;

    -- Perform the range check
    IF observation_value < lower_threshold OR observation_value > upper_threshold THEN
        -- Prepare the QC fail log
        fail_log := jsonb_build_object(
                        'qc_test_id', qc_test.id,
                        'test_type', 'range_threshold'
                    );
        RETURN fail_log;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

--- Repeated value test
CREATE OR REPLACE FUNCTION func_perform_repeated_value_test(
	observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    consecutive_records INT4;
	exclude_range JSONB;
	lower_threshold FLOAT8;
	upper_threshold FLOAT8;
	last_values FLOAT8[];
	match_count INT4 := 0;
    fail_log JSONB;
BEGIN
	-- Return NULL if the record value falls within the exclude range.
	IF qc_test.parameters ? 'excludeRange' THEN
		exclude_range := qc_test.parameters->>'excludeRange'::JSONB;
		lower_threshold := exclude_range->>'lowerThreshold';
		upper_threshold := exclude_range->>'upperThreshold';
		IF observation_record.value >= lower_threshold AND observation_record.value <= upper_threshold THEN
        	RETURN NULL;
		END IF;
	END IF;

    -- Extract consecutiveRecords from the qc_test parameters
    consecutive_records := (qc_test.parameters->>'consecutiveRecords')::INT4;

    -- Retrieve the last `consecutive_records` values (in descending order of date_time)
	last_values := func_get_last_values_of_similar_observation(observation_record, consecutive_records);

    -- If we retrieved the previous values, compare them to the current value
    IF last_values IS NOT NULL THEN
        FOREACH val IN ARRAY last_values LOOP
            IF val IS NOT NULL AND val = observation_record.value THEN
                match_count := match_count + 1;
            END IF;
        END LOOP;

        -- If all previous values match the current value, return the QC fail log
        IF match_count = consecutive_records THEN
  			-- Prepare the QC fail log
        	fail_log := jsonb_build_object(
                        'qc_test_id', qc_test.id,
                        'test_type', 'repeated_value'
                    );
        	RETURN fail_log;
        END IF;
    END IF;

    -- Return NULL if no repeated value issue was detected
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

--- Flat line test
CREATE OR REPLACE FUNCTION func_perform_flat_line_test(
	observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    consecutive_records INT4;
	last_values FLOAT8[];
	match_count INT4 := 0;
    fail_log JSONB;
BEGIN
    -- Extract consecutiveRecords from the qc_test parameters
    consecutive_records := (qc_test.parameters->>'consecutiveRecords')::INT4;
	range_value := (qc_test.parameters->>'rangeThreshold')::FLOAT8;

    -- Retrieve the last `consecutive_records` values (in descending order of date_time)
	last_values := func_get_last_values_of_similar_observation(observation_record, consecutive_records);

    -- If we retrieved the previous values, compare their difference to the current value
    IF last_values IS NOT NULL THEN
        FOREACH val IN ARRAY last_values LOOP
            IF val IS NOT NULL AND (observation_record.value - val) <= range_value THEN
                match_count := match_count + 1;
            END IF;
        END LOOP;

        -- If all previous values match are greater than the monitored range, return the QC fail log
        IF match_count = consecutive_records THEN
  			-- Prepare the QC fail log
        	fail_log := jsonb_build_object(
                        'qc_test_id', qc_test.id,
                        'test_type', 'flat_line'
                    );
        	RETURN fail_log;
        END IF;
    END IF;

    -- Return NULL if no flat line issue was detected
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

--- Returns last values of similar observation
CREATE OR REPLACE FUNCTION func_get_last_values_of_similar_observation(
	observation_record RECORD,
    consecutive_records INT4
) RETURNS JSONB AS $$
DECLARE
	last_values FLOAT8[];
BEGIN
    -- Retrieve the last `consecutive_records` values (in descending order of date_time)
    SELECT ARRAY_AGG(value) INTO last_values
    FROM observations
    WHERE station_id = observation_record.station_id
      AND element_id = observation_record.element_id
      AND source_id = observation_record.source_id
      AND elevation = observation_record.elevation
      AND period = observation_record.period
      AND date_time < observation_record.date_time
    ORDER BY date_time DESC
    LIMIT (consecutive_records - 1); -- minus 1 because current observation record is excluded by the `date_time < observation_record.date_time` filter 

-- will return NULL if no last values were found
RETURN last_values;
END;
$$ LANGUAGE plpgsql;

--- spike test
CREATE OR REPLACE FUNCTION func_perform_spike_test(
	observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    consecutive_records INT4;
	last_value FLOAT8;
    fail_log JSONB;
BEGIN
    -- Extract consecutiveRecords from the qc_test parameters
    consecutive_records := (qc_test.parameters->>'consecutiveRecords')::INT4;

 	-- Extract the spikeThreshold from the qc_test parameters
    spike_threshold := (qc_test.parameters->>'spikeThreshold')::FLOAT8;

    -- Retrieve the value from the 3rd previous consecutive record (ordered by date_time)
    SELECT value INTO last_value
    FROM observations
    WHERE station_id = observation_record.station_id
      AND element_id = observation_record.element_id
      AND source_id = observation_record.source_id
      AND elevation = observation_record.elevation
      AND period = observation_record.period
      AND date_time < observation_record.date_time
    ORDER BY date_time DESC
    LIMIT 1 OFFSET (consecutive_records - 2); -- Adjust the consecutive records to be used for offset. Note date_time < observation_record.date_time already skips current record

     -- Check if the third previous value exists and the absolute difference exceeds the threshold
    IF last_value IS NOT NULL AND ABS(observation_record.value - last_value) > spike_threshold THEN
        -- Prepare the QC fail log
        	fail_log := jsonb_build_object(
                        'qc_test_id', qc_test.id,
                        'test_type', 'spike'
                    );
        RETURN fail_log;
    END IF;

    -- Return NULL if no spike issue was detected
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

--- Relational comparison test ---
CREATE OR REPLACE FUNCTION func_perform_relational_comparison_test(
    observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    reference_value FLOAT8;
	qc_test_reference_id INT4;
	qc_test_condition VARCHAR;
    qc_fail_log JSONB;
    all_qc_fails_log JSONB := '[]'::JSONB; -- Initialize as empty JSON array
    fail_log JSONB;
BEGIN
	-- Decode the JSON parameters to extract reference_id and condition
	qc_test_reference_id := (qc_test.parameters->>'referenceElementId')::INT4;
	qc_test_condition := (qc_test.parameters->>'condition')::VARCHAR;

	SELECT value INTO reference_value
			FROM observations
			WHERE station_id = observation_record.station_id
				AND element_id = qc_test_reference_id
				AND source_id = observation_record.source_id
				AND elevation = observation_record.elevation
				AND date_time = observation_record.date_time
				AND period = observation_record.period
			LIMIT 1;

			-- Evaluate the condition
			IF NOT func_passes_qc_test_condition(observation_record.value, reference_value, qc_test_condition) THEN
				-- Prepare the QC fail log
				all_qc_fails_log := all_qc_fails_log || jsonb_build_object(
                            								'qc_test_id', qc_test.id,
                            								'test_type', 'relational_comparison'
                        									);
			END IF;
    
    -- Return null if there are no QC fails
	RETURN NULLIF(all_qc_fails_log, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- perform qc test condition
CREATE OR REPLACE FUNCTION func_passes_qc_test_condition(
    primary_value FLOAT8,
    reference_value FLOAT8,
    qc_test_condition VARCHAR
) RETURNS BOOL AS $$
BEGIN
    -- Return TRUE if reference_value or primary_value is NULL, implying that null values pass the tests
    IF primary_value IS NULL OR reference_value IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Evaluate the condition based on the specified relational operator
    RETURN CASE qc_test_condition
        WHEN '>' THEN primary_value > reference_value
        WHEN '<' THEN primary_value < reference_value
        WHEN '=' THEN primary_value = reference_value
        WHEN '>=' THEN primary_value >= reference_value
        WHEN '<=' THEN primary_value <= reference_value
        ELSE FALSE  -- Return FALSE for any undefined conditions
    END CASE;
END;
$$ LANGUAGE plpgsql;


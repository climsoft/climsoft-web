--- qc record function. Returns true when one qc tests fails and false when none fails or no qc was was done
CREATE OR REPLACE FUNCTION func_execute_qc_tests(
    observation_record RECORD,
    user_id INT4
) RETURNS BOOL AS $$
DECLARE
    qc_test RECORD;
    qc_test_log JSONB;
    all_qc_tests_log JSONB := '[]'::JSONB;
    final_qc_status observations_qc_status_enum := 'passed';
BEGIN
    -- Skip QC if value is NULL
    IF observation_record.value IS NULL THEN
        RETURN TRUE; -- Return false when no update of the qc status
    END IF;

    -- Loop through all relevant QC tests
    FOR qc_test IN
        SELECT *
        FROM qc_tests
        WHERE element_id = observation_record.element_id
          AND observation_level = observation_record.level
          AND observation_interval = observation_record.interval
          AND disabled = FALSE
    LOOP
        BEGIN
			-- RAISE NOTICE 'Executing test ID %, type %', qc_test.id, qc_test.qc_test_type;
            CASE qc_test.qc_test_type
                WHEN 'range_threshold' THEN
                    qc_test_log := func_perform_range_threshold_test(observation_record, qc_test); 
                WHEN 'flat_line' THEN
                    qc_test_log := func_perform_flat_line_test(observation_record, qc_test);
				WHEN 'spike' THEN
                    qc_test_log := func_perform_spike_test(observation_record, qc_test);
                WHEN 'relational_comparison' THEN
                    qc_test_log := func_perform_relational_comparison_test(observation_record, qc_test);
                WHEN 'contextual_consistency' THEN
                    qc_test_log := func_perform_contextual_consistency_test(observation_record, qc_test);
				ELSE 
					RAISE EXCEPTION 'Unsupported QC test type: %', qc_test.qc_test_type;
            END CASE;

            IF qc_test_log IS NOT NULL THEN
                all_qc_tests_log := all_qc_tests_log || qc_test_log;
                IF (qc_test_log->>'qcStatus')::observations_qc_status_enum = 'failed' THEN
                    final_qc_status := 'failed';
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'QC test % failed with error: %', qc_test.qc_test_type, SQLERRM;
        END;
    END LOOP;

    -- If no QC logs were generated (no relevant tests) then set qc status to none and reset the qc log
    IF all_qc_tests_log = '[]'::JSONB THEN
		final_qc_status := 'none';
		all_qc_tests_log := NULL;
    END IF;

    -- Update the observation record
    UPDATE observations
    SET qc_status = final_qc_status,
        qc_test_log = all_qc_tests_log,
		entry_user_id = user_id
    WHERE station_id = observation_record.station_id
      AND element_id = observation_record.element_id
      AND level = observation_record.level
      AND interval = observation_record.interval
      AND source_id = observation_record.source_id
      AND date_time = observation_record.date_time;
RETURN final_qc_status = 'failed'; -- Return true after successful update of the qc status
END;
$$ LANGUAGE plpgsql;


--- Range threshold ---
CREATE OR REPLACE FUNCTION func_perform_range_threshold_test(
    observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    lower_threshold FLOAT8;
    upper_threshold FLOAT8;
    qc_test_log JSONB;
    params JSONB;
    obs_month INT;
    threshold_pair JSONB;
BEGIN
    params := qc_test.parameters;

    -- Check for station-specific thresholds first
    IF params ? 'stationIds' AND jsonb_array_length(params->'stationIds') > 0 AND NOT params->'stationIds' @> to_jsonb(observation_record.station_id) THEN
        -- This QC test is for specific stations, and the current observation's station is not one of them.
        -- So we don't perform the test. Returning NULL indicates the test was not applicable.
        RETURN NULL;
    END IF;

    -- Check for monthly thresholds
    IF params ? 'monthsThresholds' THEN
        obs_month := EXTRACT(MONTH FROM observation_record.date_time);
        threshold_pair := (params->'monthsThresholds')->(obs_month - 1);
        IF threshold_pair IS NOT NULL AND threshold_pair != 'null'::jsonb THEN
            lower_threshold := (threshold_pair->>'lowerThreshold')::FLOAT8;
            upper_threshold := (threshold_pair->>'upperThreshold')::FLOAT8;
        END IF;
    END IF;

    -- If no monthly threshold was found, fall back to allRangeThreshold
    IF lower_threshold IS NULL AND params ? 'allRangeThreshold' THEN
        threshold_pair := params->'allRangeThreshold';
        lower_threshold := (threshold_pair->>'lowerThreshold')::FLOAT8;
        upper_threshold := (threshold_pair->>'upperThreshold')::FLOAT8;
    END IF;

    -- Perform the range check and create the qc test log
    IF lower_threshold IS NOT NULL AND (observation_record.value < lower_threshold OR observation_record.value > upper_threshold) THEN
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'failed');
	ELSE
		 qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
    END IF;
    RETURN qc_test_log;
END;
$$ LANGUAGE plpgsql;

--- Flat line test
CREATE OR REPLACE FUNCTION func_perform_flat_line_test(
	observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    consecutive_records INT4;
	flat_line_threshold FLOAT8;
	exclude_range JSONB;
	lower_threshold FLOAT8;
	upper_threshold FLOAT8;
	val FLOAT8;
	last_values FLOAT8[];
	match_count INT4 := 0;
    qc_test_log JSONB;
BEGIN
	-- Return PASSED if the record value falls within the exclude range.
	IF qc_test.parameters ? 'excludeRange' THEN
		exclude_range := (qc_test.parameters->>'excludeRange')::JSONB;
		lower_threshold := (exclude_range->>'lowerThreshold')::FLOAT8;
		upper_threshold := (exclude_range->>'upperThreshold')::FLOAT8;
		IF observation_record.value >= lower_threshold AND observation_record.value <= upper_threshold THEN
        	return jsonb_build_object('qcTestId', qc_test.id,  'qcStatus', 'passed');
		END IF;
	END IF;

    -- Extract consecutiveRecords from the qc_test parameters
    consecutive_records := (qc_test.parameters->>'consecutiveRecords')::INT4;
	flat_line_threshold := (qc_test.parameters->>'flatLineThreshold')::FLOAT8;

    -- Retrieve the last `consecutive_records` values (in descending order of date_time)
	last_values := func_get_last_values_of_similar_observation(observation_record, consecutive_records);

    -- If we retrieved the previous values, compare their difference to the current value
    IF last_values IS NOT NULL THEN
        FOREACH val IN ARRAY last_values LOOP
            IF val IS NOT NULL AND ABS(observation_record.value - val) <= flat_line_threshold THEN
                match_count := match_count + 1;
            END IF;
        END LOOP;

        -- If match found then it's a fail
        IF match_count >= (consecutive_records - 1) THEN 
        	qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'failed');
		ELSE
        	qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
        END IF;
	ELSE
			qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
    END IF;
    RETURN qc_test_log;
END;
$$ LANGUAGE plpgsql;

--- Returns last values of similar observation
CREATE OR REPLACE FUNCTION func_get_last_values_of_similar_observation(
    observation_record RECORD,
    consecutive_records INT4
) RETURNS FLOAT8[] AS $$
DECLARE
    last_values FLOAT8[];
BEGIN
    -- Retrieve last N-1 values prior to current record, ordered by datetime descending
    SELECT ARRAY_AGG(val) INTO last_values
    FROM (
        SELECT value AS val
        FROM observations
        WHERE station_id = observation_record.station_id
          AND element_id = observation_record.element_id
          AND level = observation_record.level
          AND interval = observation_record.interval
          AND date_time < observation_record.date_time
        ORDER BY date_time DESC
        LIMIT (consecutive_records - 1) -- minus 1 because current observation record is excluded by the `date_time < observation_record.date_time` filter
    ) sub;
    RETURN last_values;
END;
$$ LANGUAGE plpgsql;

--- spike test
CREATE OR REPLACE FUNCTION func_perform_spike_test(
	observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
	spike_threshold FLOAT8;
	last_value FLOAT8;
    qc_test_log JSONB;
BEGIN
 	-- Extract the spikeThreshold from the qc_test parameters
    spike_threshold := (qc_test.parameters->>'spikeThreshold')::FLOAT8;

    -- Retrieve the value from the 3rd previous consecutive record (ordered by date_time)
    SELECT value INTO last_value
    FROM observations
    WHERE station_id = observation_record.station_id
      AND element_id = observation_record.element_id
      AND level = observation_record.level
      AND interval = observation_record.interval
      AND date_time < observation_record.date_time
    ORDER BY date_time DESC
    LIMIT 1; -- Note date_time < observation_record.date_time already skips current record

     -- Check if the third previous value exists and the absolute difference exceeds the threshold
    IF last_value IS NOT NULL AND ABS(observation_record.value - last_value) >= spike_threshold THEN 
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'failed');
	ELSE
		qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
    END IF;
    RETURN qc_test_log;
END;
$$ LANGUAGE plpgsql;

--- Relational comparison test ---
CREATE OR REPLACE FUNCTION func_perform_relational_comparison_test(
    observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
    reference_value FLOAT8;
	reference_id INT4;
	reference_condition VARCHAR;
    qc_test_log JSONB;  
BEGIN
	-- Decode the JSON parameters to extract reference_id and condition
	reference_id := (qc_test.parameters->>'referenceElementId')::INT4;
	reference_condition := (qc_test.parameters->>'condition')::VARCHAR;

	-- Get the reference element's value at the same context (station/level/interval/date_time). Note source id is intentionally excluded.
	SELECT value INTO reference_value
			FROM observations
			WHERE station_id = observation_record.station_id
				AND element_id = reference_id
				AND level = observation_record.level
				AND interval = observation_record.interval
				AND date_time = observation_record.date_time				
			LIMIT 1;

    -- If either value is NULL, treat as PASS (do not flag)
    IF observation_record.value IS NULL OR reference_value IS NULL THEN
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
        RETURN qc_test_log;
    END IF;

	-- Evaluate the condition and create the qc test log
	IF func_eval_condition(observation_record.value, reference_condition, reference_value) THEN 
		qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'failed');
	ELSE
		qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');	
	END IF;

	RETURN qc_test_log;
END;
$$ LANGUAGE plpgsql;

--- Contextual consistency test ---
CREATE OR REPLACE FUNCTION func_perform_contextual_consistency_test(
    observation_record RECORD,
    qc_test RECORD
) RETURNS JSONB AS $$
DECLARE
	reference_id INT4;
	primary_check JSONB;
	primary_condition VARCHAR;
	primary_threshold FLOAT8;
	reference_check JSONB;
	reference_condition VARCHAR;
	reference_threshold FLOAT8;
    reference_value FLOAT8;
    primary_matches BOOL;
    reference_matches BOOL;
    qc_test_log JSONB;  
BEGIN
	-- Decode the JSON parameters to extract reference_id and condition
	reference_id := (qc_test.parameters->>'referenceElementId')::INT4;

	primary_check := (qc_test.parameters->>'primaryCheck')::JSONB;
	primary_condition := (primary_check->>'condition')::VARCHAR;
	primary_threshold := (primary_check->>'value')::FLOAT8;

	reference_check := (qc_test.parameters->>'referenceCheck')::JSONB;
	reference_condition := (reference_check->>'condition')::VARCHAR;
	reference_threshold := (reference_check->>'value')::FLOAT8;

	-- Get the reference element's value at the same context (station/level/interval/date_time). Note source id is intentionally excluded.
	SELECT value INTO reference_value
			FROM observations
			WHERE station_id = observation_record.station_id
				AND element_id = reference_id
				AND level = observation_record.level
				AND interval = observation_record.interval 
				AND date_time = observation_record.date_time				
			LIMIT 1;

    -- As with relational comparison: if either value is NULL, treat as PASS (do not flag)
    IF observation_record.value IS NULL OR reference_value IS NULL THEN
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
        RETURN qc_test_log;
    END IF;

    -- Evaluate each side against its threshold using the same helper 
    primary_matches := func_eval_condition(observation_record.value, primary_condition, primary_threshold);
    reference_matches := func_eval_condition(reference_value, reference_condition, reference_threshold);

    -- Contextual rule: if BOTH conditions are satisfied, the observation fails
    IF primary_matches AND reference_matches THEN
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'failed');
    ELSE
        qc_test_log := jsonb_build_object('qcTestId', qc_test.id, 'qcStatus', 'passed');
    END IF;

    RETURN qc_test_log;
END;
$$ LANGUAGE plpgsql;

-- Perform comparison check (left op right)
CREATE OR REPLACE FUNCTION func_eval_condition(
    left_value FLOAT8,
    condition VARCHAR,
    right_value FLOAT8
) RETURNS BOOL AS $$
BEGIN
    CASE condition
        WHEN '>'  THEN RETURN left_value >  right_value;
        WHEN '<'  THEN RETURN left_value <  right_value;
        WHEN '='  THEN RETURN left_value =  right_value;
        WHEN '>=' THEN RETURN left_value >= right_value;
        WHEN '<=' THEN RETURN left_value <= right_value;
        ELSE
            RAISE EXCEPTION 'Unknown condition in func_eval_condition: %', condition;
    END CASE;
END;
$$ LANGUAGE plpgsql;
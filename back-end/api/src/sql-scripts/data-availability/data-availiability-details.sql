CREATE OR REPLACE FUNCTION func_data_availaibility_details(
    p_station_ids varchar[] DEFAULT NULL,
    p_element_ids int[] DEFAULT NULL,
    p_level int DEFAULT NULL,
    p_interval int DEFAULT NULL,
    p_from_date timestamptz DEFAULT NULL,
    p_to_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
    station_id varchar,
    element_id int,
    level int,
    "interval" int,
    from_date timestamptz,
    to_date timestamptz,
    expected bigint,
    non_missing bigint,
    confirmed_missing bigint,
    gaps bigint,
    gaps_plus_missing bigint,
    qc_nones bigint,
    qc_passes bigint,
    qc_fails bigint
)
AS $$
DECLARE
    _sql TEXT;
    _where_conditions TEXT := ''; 
BEGIN
    -- Build WHERE clause conditions dynamically 
	 _where_conditions := 'o.deleted = FALSE';

    IF p_station_ids IS NOT NULL THEN
        _where_conditions := _where_conditions || ' AND o.station_id = ANY($1)';
    END IF;
    
    IF p_element_ids IS NOT NULL THEN
         _where_conditions := _where_conditions || ' AND o.element_id = ANY($2)';
    END IF;
    
    IF p_level IS NOT NULL THEN
        _where_conditions := _where_conditions || ' AND o.level = $3';
    END IF;
    
    IF p_interval IS NOT NULL THEN
        _where_conditions := _where_conditions || ' AND o."interval" = $4'; 
    END IF;
    
    IF p_from_date IS NOT NULL THEN
         _where_conditions := _where_conditions || ' AND o.date_time >= $5';
    END IF;
    
    IF p_to_date IS NOT NULL THEN
        _where_conditions := _where_conditions || ' AND o.date_time <= $6';
    END IF;

    -- Construct the complete SQL
   _sql := format($q$
					WITH observation_groups AS (
									SELECT
										o.station_id, 
										o.element_id, 
										o.level, 
										o."interval", 
										MIN(o.date_time) AS from_date, 
										MAX(o.date_time) AS to_date
									FROM observations o
									WHERE %s
									GROUP BY o.station_id, o.element_id, o.level, o."interval"
					),
					time_series AS (
									SELECT
										og.station_id, 
										og.element_id, 
										og.level, og.
										"interval", 
										generate_series(og.from_date, og.to_date, (og."interval" || ' minutes')::interval) AS date_time
									FROM observation_groups og
					),
					infilled_data AS (
									SELECT
										ts.station_id, 
										ts.element_id, 
										ts.level, 
										ts."interval", 
										ts.date_time,
										o.source_id, 
										o.value, 
										o.flag, 
										o.qc_status
									FROM time_series ts
									LEFT JOIN observations o
									ON  o.station_id = ts.station_id
									AND o.element_id = ts.element_id
									AND o.level      = ts.level
									AND o."interval" = ts."interval"
									AND o.date_time  = ts.date_time
					)
					SELECT
						id.station_id, 
						id.element_id, 
						id.level, 
						id."interval", 
						MIN(id.date_time) AS from_date, 
						MAX(id.date_time) AS to_date,
						COUNT(*) AS expected,
						COUNT(*) FILTER (WHERE id.value IS NOT NULL) AS non_missing,
						COUNT(*) FILTER (WHERE id.flag = 'missing') AS confirmed_missing,
						COUNT(*) FILTER (WHERE id.value IS NULL AND id.flag IS NULL) AS gaps,
						( COUNT(*) FILTER (WHERE id.flag = 'missing') + COUNT(*) FILTER (WHERE id.value IS NULL AND id.flag IS NULL) ) AS gaps_plus_missing,
						COUNT(*) FILTER (WHERE id.qc_status = 'none') AS qc_nones,
						COUNT(*) FILTER (WHERE id.qc_status = 'passed') AS qc_passes,
						COUNT(*) FILTER (WHERE id.qc_status = 'failed') AS qc_fails
					FROM infilled_data id
					GROUP BY id.station_id, id.element_id, id.level, id."interval"
					ORDER BY id.station_id, id.element_id, id.level, id."interval"
					$q$, _where_conditions);


    -- Execute the dynamic SQL with parameters
    RETURN QUERY EXECUTE _sql USING p_station_ids, p_element_ids, p_level, p_interval, p_from_date, p_to_date;
END;
$$ LANGUAGE plpgsql;
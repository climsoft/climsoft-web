SELECT
    s.id                                        AS "Station ID",
    s.name                                      AS "Station Name",
    s.description                               AS "Description",
    s.wmo_id                                    AS "WMO ID",
    s.wigos_id                                  AS "WIGOS ID",
    s.icao_id                                   AS "ICAO ID",
    s.status                                    AS "Status",
    s.observation_processing_method             AS "Processing Method",
    ST_Y(s.location::geometry)                 AS "Latitude",
    ST_X(s.location::geometry)                 AS "Longitude",
    s.elevation                                 AS "Elevation (m)",
    s.date_established                          AS "Date Established",
    s.date_closed                               AS "Date Closed",
    env.name                                    AS "Observation Environment",
    foc.name                                    AS "Observation Focus",
    owner_org.name                              AS "Owner Organisation",
    op_org.name                                 AS "Operator Organisation"
FROM stations s
LEFT JOIN station_observation_environments env  ON env.id = s.observation_environment_id
LEFT JOIN station_observation_focuses foc       ON foc.id = s.observation_focus_id
LEFT JOIN organisations owner_org               ON owner_org.id = s.owner_id
LEFT JOIN organisations op_org                  ON op_org.id = s.operator_id

SELECT
    o.station_id                                                        AS "Station ID",
    s.name                                                              AS "Station Name",
    o.element_id                                                        AS "Element ID",
    e.name                                                              AS "Element",
    e.abbreviation                                                      AS "Element Abbreviation",
    e.units                                                             AS "Units",
    DATE_TRUNC('month', o.date_time)                                   AS "Month",
    EXTRACT(YEAR  FROM o.date_time)::int                               AS "Year",
    EXTRACT(MONTH FROM o.date_time)::int                               AS "Month Number",
    AVG(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Monthly Mean",
    MAX(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Monthly Maximum",
    MIN(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Monthly Minimum",
    SUM(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Monthly Total",
    COUNT(o.value)                                                      AS "Observation Count",
    COUNT(*) FILTER (WHERE o.qc_status = 'failed')                    AS "QC Failed Count"
FROM observations o
JOIN stations s ON s.id = o.station_id
JOIN elements e ON e.id = o.element_id
WHERE o.deleted = FALSE
  AND o.value IS NOT NULL
GROUP BY
    o.station_id, s.name,
    o.element_id, e.name, e.abbreviation, e.units,
    DATE_TRUNC('month', o.date_time),
    EXTRACT(YEAR  FROM o.date_time),
    EXTRACT(MONTH FROM o.date_time)

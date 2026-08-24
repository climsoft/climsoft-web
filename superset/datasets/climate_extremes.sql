SELECT
    o.station_id                                                        AS "Station ID",
    s.name                                                              AS "Station Name",
    o.element_id                                                        AS "Element ID",
    e.name                                                              AS "Element",
    e.abbreviation                                                      AS "Element Abbreviation",
    e.units                                                             AS "Units",
    EXTRACT(YEAR FROM o.date_time)::int                                AS "Year",
    MAX(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Annual Maximum",
    MIN(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Annual Minimum",
    AVG(
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "Annual Mean",
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "10th Percentile",
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY
        CASE WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision ELSE o.value END
    )                                                                   AS "90th Percentile",
    COUNT(o.value)                                                      AS "Observation Count"
FROM observations o
JOIN stations s ON s.id = o.station_id
JOIN elements e ON e.id = o.element_id
WHERE o.deleted = FALSE
  AND o.value IS NOT NULL
  AND o.qc_status != 'failed'
GROUP BY
    o.station_id, s.name,
    o.element_id, e.name, e.abbreviation, e.units,
    EXTRACT(YEAR FROM o.date_time)

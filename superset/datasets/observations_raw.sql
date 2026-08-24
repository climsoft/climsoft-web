SELECT
    o.station_id                                                        AS "Station ID",
    s.name                                                              AS "Station Name",
    o.element_id                                                        AS "Element ID",
    e.name                                                              AS "Element",
    e.abbreviation                                                      AS "Element Abbreviation",
    e.units                                                             AS "Units",
    o.date_time                                                         AS "Date Time",
    o.interval                                                          AS "Interval (min)",
    o.level                                                             AS "Level",
    o.value                                                             AS "Raw Value",
    CASE
        WHEN e.entry_scale_factor IS NOT NULL AND e.entry_scale_factor != 0
        THEN o.value / e.entry_scale_factor::double precision
        ELSE o.value
    END                                                                 AS "Value",
    o.qc_status                                                         AS "QC Status",
    f.name                                                              AS "QC Flag",
    src.name                                                            AS "Source",
    o.comment                                                           AS "Comment"
FROM observations o
JOIN stations s          ON s.id = o.station_id
JOIN elements e          ON e.id = o.element_id
LEFT JOIN flags f        ON f.id = o.flag_id
LEFT JOIN source_templates src ON src.id = o.source_id
WHERE o.deleted = FALSE

SELECT
    o.station_id                                                        AS "Station ID",
    s.name                                                              AS "Station Name",
    o.element_id                                                        AS "Element ID",
    e.name                                                              AS "Element",
    e.abbreviation                                                      AS "Element Abbreviation",
    o.interval                                                          AS "Interval (min)",
    DATE_TRUNC('month', o.date_time)                                   AS "Month",
    EXTRACT(YEAR  FROM o.date_time)::int                               AS "Year",
    EXTRACT(MONTH FROM o.date_time)::int                               AS "Month Number",
    COUNT(*)                                                            AS "Total Slots",
    COUNT(o.value)                                                      AS "Values Present",
    COUNT(*) - COUNT(o.value)                                          AS "Missing Values",
    ROUND(
        100.0 * COUNT(o.value) / NULLIF(COUNT(*), 0), 1
    )                                                                   AS "Completeness (%)",
    COUNT(*) FILTER (WHERE o.qc_status = 'passed')                    AS "QC Passed",
    COUNT(*) FILTER (WHERE o.qc_status = 'failed')                    AS "QC Failed",
    COUNT(*) FILTER (WHERE o.qc_status = 'none')                      AS "Not QC Checked"
FROM observations o
JOIN stations s ON s.id = o.station_id
JOIN elements e ON e.id = o.element_id
WHERE o.deleted = FALSE
GROUP BY
    o.station_id, s.name,
    o.element_id, e.name, e.abbreviation,
    o.interval,
    DATE_TRUNC('month', o.date_time),
    EXTRACT(YEAR  FROM o.date_time),
    EXTRACT(MONTH FROM o.date_time)

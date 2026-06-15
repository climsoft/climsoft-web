export interface FlagDefinition {
    flagColumnPosition: number;
    flagsToFetch?: { sourceId: string, databaseId: number }[];
}

export interface ValueDefinition {

    /** Value column position. */
    valueColumnPosition: number,

    /** Flag column position. Optional */
    flagDefinition?: FlagDefinition,
}

/**
 * Station column is optional.
 * If specified, it must be a single.
 */
export interface StationDefinition {

    /**
     * Represents the column position.
     */
    columnPosition: number;

    /**
     * Represents elements to fetch and matches the source ids to the database element ids. 
     * It is optional, meaning fetch all as database element ids.
     */
    stationsToFetch?: {
        sourceId: string,
        databaseId: string
    }[];

}

/**
 * Element and Value column specifications.
 * 
 */
export interface ElementDefinition {

    /**
       * Used when there are elements.
       * Must be either a single or multiple columns.
       */
    hasElement?: {
        /**
         *  Used when elements are in a single column.
         */
        singleColumn?: {

            elementColumnPosition: number,
            /**
             * The elements to fetch and matches the source ids to the database element ids. 
             * It is optional, meaning fetch all as database element ids.
             */
            elementsToFetch?: { sourceId: string, databaseId: number }[],
        },

        /**
         *  Used when elements are in multiple columns.
         */
        multipleColumn?: {

            /**
            * Represents the column position.
            */
            columnPosition: number,

            /**
             * Represents the corresponding database element id
             */
            databaseId: number
        }[]
    };

    /**
     * Used when there is no element.
     */
    noElement?: {
        /**
         * The default element id (should be in the database). 
         */
        databaseId: number,
    };

}

/**
 * When columnPosition is not specified then the defaultInterval should be specified, that is, 
 * either columnPosition or defaultInterval must be provided, but not both.
 */
export interface IntervalDefinition {
    columnPosition?: number;
    defaultValue?: number;
}

export interface LevelDefinition {
    columnPosition?: number;
    defaultValue?: number;
}

// ─── Enum naming convention ──────────────────────────────────────────────
// Members in DateTimeFormat / DateFormat / TimeFormat follow the pattern:
//
//   <DATE_LAYOUT>_<SEPARATOR>_<TIME_LAYOUT>[_MODIFIER]
//
//   DATE_LAYOUT  YMD | DMY | MDY                         — component order
//                D_MON_Y                                 — abbreviated month name (%b)
//                Y_J                                     — year + day-of-year (Julian)
//
//   SEPARATOR    DASH | SLASH | DOT | SPACE              — visible separator
//                T                                       — ISO 8601 T-separator (datetime only)
//                COMPACT                                 — no separator at all
//
//   TIME_LAYOUT  HMS | HM | H                            — hour-only is %H
//                (omitted for date-only enums)
//
//   MODIFIER     FRAC                                    — fractional seconds (%f)
//                Z                                       — UTC indicator (literal Z)
//                AMPM                                    — 12-hour with AM/PM (%I + %p)
//                UNPADDED                                — no zero padding on hour (%-H)
//                COMPACT                                 — compact form of the time layout
//
// Special prefix: ISO_ marks ISO 8601 / RFC 3339 formats so the W3C-standard
// entries are easy to spot in the dropdown.
//
// Values stay as the strftime pattern itself. DuckDB parse these directly.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Single-column datetime formats. Values are DuckDB/Postgres strftime patterns;
 * keys are stable identifiers so consumers reference them by name rather than literal string.
 * Date-only formats are NOT included — use the `dateInSingleColumn` path with `DateFormat` for those.
 */
export enum DateTimeFormat {
    // ISO 8601 / RFC 3339 (W3C standard; matches the export pipeline and most modern APIs)
    ISO_YMD_T_HMS = '%Y-%m-%dT%H:%M:%S',           // 2024-01-15T14:30:00
    ISO_YMD_T_HMS_Z = '%Y-%m-%dT%H:%M:%SZ',        // 2024-01-15T14:30:00Z
    ISO_YMD_T_HMS_FRAC = '%Y-%m-%dT%H:%M:%S.%f',   // 2024-01-15T14:30:00.123456
    ISO_YMD_T_HM = '%Y-%m-%dT%H:%M',               // 2024-01-15T14:30

    // YMD, space-separated
    YMD_DASH_HMS = '%Y-%m-%d %H:%M:%S',
    YMD_DASH_HM = '%Y-%m-%d %H:%M',
    YMD_DASH_HMS_FRAC = '%Y-%m-%d %H:%M:%S.%f',
    YMD_SLASH_HMS = '%Y/%m/%d %H:%M:%S',
    YMD_SLASH_HM = '%Y/%m/%d %H:%M',

    // DMY, space-separated
    DMY_DASH_HMS = '%d-%m-%Y %H:%M:%S',
    DMY_DASH_HM = '%d-%m-%Y %H:%M',
    DMY_SLASH_HMS = '%d/%m/%Y %H:%M:%S',
    DMY_SLASH_HM = '%d/%m/%Y %H:%M',

    // MDY (US), space-separated
    MDY_DASH_HMS = '%m-%d-%Y %H:%M:%S',
    MDY_DASH_HM = '%m-%d-%Y %H:%M',
    MDY_SLASH_HMS = '%m/%d/%Y %H:%M:%S',
    MDY_SLASH_HM = '%m/%d/%Y %H:%M',

    // 12-hour clock with AM/PM (Excel and US-locale form entries)
    YMD_DASH_HM_AMPM = '%Y-%m-%d %I:%M %p',
    DMY_SLASH_HM_AMPM = '%d/%m/%Y %I:%M %p',
    MDY_SLASH_HM_AMPM = '%m/%d/%Y %I:%M %p',

    // Dot-separated (German / Russian / Eastern European locales)
    DMY_DOT_HMS = '%d.%m.%Y %H:%M:%S',
    DMY_DOT_HM = '%d.%m.%Y %H:%M',
    YMD_DOT_HMS = '%Y.%m.%d %H:%M:%S',

    // Abbreviated month name (legacy and NCDC datasets)
    D_MON_Y_DASH_HMS = '%d-%b-%Y %H:%M:%S',        // 15-Jan-2024 14:30:00
    D_MON_Y_SPACE_HM = '%d %b %Y %H:%M',           // 15 Jan 2024 14:30

    // ISO 8601 basic / WMO / BUFR compact
    YMDHMS_COMPACT = '%Y%m%d%H%M%S',               // 20240115143000
    YMDHM_COMPACT = '%Y%m%d%H%M',                  // 202401151430
}

/** Date-only formats. Used by `dateInSingleColumn.dateFormat` and `dateTimeInTwoColumns.dateFormat`. */
export enum DateFormat {
    YMD_DASH = '%Y-%m-%d',                         // 2024-01-15 (ISO)
    DMY_DASH = '%d-%m-%Y',                         // 15-01-2024
    MDY_DASH = '%m-%d-%Y',                         // 01-15-2024 (US)
    YMD_SLASH = '%Y/%m/%d',
    DMY_SLASH = '%d/%m/%Y',
    MDY_SLASH = '%m/%d/%Y',                        // US Excel default
    YMD_DOT = '%Y.%m.%d',
    DMY_DOT = '%d.%m.%Y',                          // German/Russian
    YMD_COMPACT = '%Y%m%d',                        // 20240115 (ISO basic / WMO)
    D_MON_Y_DASH = '%d-%b-%Y',                     // 15-Jan-2024
    D_MON_Y_SPACE = '%d %b %Y',                    // 15 Jan 2024 (NCDC-style)
    Y_J_DASH = '%Y-%j',                            // 2024-015 (year-day of year)
    YJ_COMPACT = '%Y%j',                           // 2024015 (basic Julian)
}

/** Time-only formats. Used by `dateTimeInTwoColumns.timeFormat` and `dateTimeInMultipleColumns.timeFormat`. */
export enum TimeFormat {
    HMS = '%H:%M:%S',                              // 14:30:00
    HM = '%H:%M',                                  // 14:30
    HM_UNPADDED = '%-H:%M',                        // 9:30 (no padding)
    H = '%H',                                      // 14 (zero-padded hour only)
    H_UNPADDED = '%-H',                            // 9 (unpadded hour only)
    HMS_FRAC = '%H:%M:%S.%f',                      // 14:30:00.123456 (sub-second AWS data)
    HMS_COMPACT = '%H%M%S',                        // 143000 (WMO / synoptic)
    HM_COMPACT = '%H%M',                           // 1430 (WMO / METAR)
    HMS_AMPM = '%I:%M:%S %p',                      // 02:30:00 PM
    HM_AMPM = '%I:%M %p',                          // 02:30 PM
}

export interface DateTimeDefinition {

    /** A single column contains both date and time (e.g. '2024-01-15 08:00:00'). */
    dateTimeInSingleColumn?: {
        columnPosition: number;
        datetimeFormat: DateTimeFormat;
    };

    /** A single column contains only the date. A default hour supplies the time component. */
    dateInSingleColumn?: {
        columnPosition: number;
        dateFormat: DateFormat;
        defaultHour: number;
    };

    /** Date and time are in two separate columns. */
    dateTimeInTwoColumns?: {
        dateColumnPosition: number;
        dateFormat: DateFormat;
        timeColumnPosition: number;
        timeFormat: TimeFormat;
    };

    /** Date and time are split across year, month, day and time columns. */
    dateTimeInMultipleColumns?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumnPosition: string; // For multiple columns format will be like columnPosX-columnPosY
        timeColumnPosition: number;
        timeFormat: TimeFormat;
    };

    /** Date is split across year, month, day columns. A default hour supplies the time component. */
    dateInMultipleColumns?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumnPosition: string; // For multiple columns format will be like columnPosX-columnPosY
        defaultHour: number;
    };
}

export interface ImportSourceTabularParamsModel {

    /** Whether to fetch station and its column position */
    stationDefinition?: StationDefinition;

    /**Whether to include elements or not */
    elementDefinition: ElementDefinition;

    /** Interval of the observation */
    intervalDefinition: IntervalDefinition;

    /** level of observation */
    levelDefinition: LevelDefinition;

    /** Date time columns and formats */
    datetimeDefinition: DateTimeDefinition;

    valueDefinition?: ValueDefinition;

    commentColumnPosition?: number;

    /**
     * Number of rows to skip.
     */
    rowsToSkip: number;

    /**
    * Applies to csv file formats onl e.g CSV, DAT, TSV.
    */
    delimiter?: string;

}
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from "class-validator";


/**
 * Discriminated shape: exactly one of `inColumn` or `default` must be set.
 *
 * - `inColumn` — the interval value lives in a file column (in minutes).
 * - `default`  — no interval column; supply a default value (in minutes).
 */
export class IntervalDefinition {
    @IsOptional()
    inColumn?: {
        columnPosition: number;
    };

    @IsOptional()
    default?: {
        value: number; // in minutes; 1 minute is the lowest
    };
}

/**
 * Discriminated shape: exactly one of `inColumn` or `default` must be set.
 *
 * - `inColumn` — the level value lives in a file column.
 * - `default`  — no level column; supply a default value.
 */
export class LevelDefinition {
    @IsOptional()
    inColumn?: {
        columnPosition: number;
    };

    @IsOptional()
    default?: {
        value: number; // zero is the lowest
    };
}

/**
 * Comment column wrapper. Mirrors the other `<Name>Definition` types so the model
 * stays consistent and comment has room to grow (e.g. fallback text, combined columns).
 */
export class CommentDefinition {
    @IsInt()
    @Min(1)
    columnPosition!: number;
}

/**
 * One row of the source → database flag id mapping. Promoted to a class so
 * class-transformer descends into each element under `enableImplicitConversion`
 * (an inline `{...}[]` element would otherwise be mangled into an Array with
 * string-keyed props by the reflect-metadata fallback).
 */
export class FlagToFetch {
    @IsString()
    @IsNotEmpty()
    sourceId!: string;

    @IsInt()
    @Min(1)
    databaseId!: number;
}

export class FlagDefinition {
    @IsInt()
    @Min(1)
    flagColumnPosition!: number;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => FlagToFetch)
    flagsToFetch?: FlagToFetch[];
}

export class ValueDefinition {
    /** Value column position. */
    @IsInt()
    @Min(1)
    valueColumnPosition!: number;

    /** Flag column position. Optional */
    @IsOptional()
    @ValidateNested()
    @Type(() => FlagDefinition)
    flagDefinition?: FlagDefinition;
}


/**
 * One row of the source → database station id mapping. See {@link FlagToFetch}
 * for why this needs to be a class rather than an inline `{...}` type.
 */
export class StationToFetch {
    @IsString()
    @IsNotEmpty()
    sourceId!: string;

    @IsString()
    @IsNotEmpty()
    databaseId!: string;
}

/**
 * Station column is optional.
 * If specified, it must be a single.
 */
export class StationDefinition {

    /**
     * Represents the column position.
     */
    @IsInt()
    @Min(1)
    columnPosition!: number;

    /**
     * Represents stations to fetch and matches the source ids to the database element ids.
     * It is optional, meaning fetch all as valid database station ids.
     */
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => StationToFetch)
    stationsToFetch?: StationToFetch[];

}

/** No-column branch: every observation gets this default database element id. */
export class NoElementConfig {
    @IsInt()
    @Min(1)
    databaseId!: number;
}

/**
 * One row of the source → database element id mapping used inside
 * {@link SingleElementColumn}. See {@link FlagToFetch} for the class-transformer
 * rationale.
 */
export class ElementToFetch {
    @IsString()
    @IsNotEmpty()
    sourceId!: string;

    @IsInt()
    @Min(1)
    databaseId!: number;
}

/**
 * Single-column branch: one file column holds the element id per row, with an
 * optional source→database id mapping.
 */
export class SingleElementColumn {
    @IsInt()
    @Min(1)
    columnPosition!: number;

    /**
     * Source → database element id mapping. Optional — when omitted, the column's cell
     * value is interpreted directly as a database element id.
     */
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ElementToFetch)
    elementsToFetch?: ElementToFetch[];
}

/** One row of the wide-pivot mapping used inside {@link MultipleElementColumns}. */
export class ElementColumnMapping {
    @IsInt()
    @Min(1)
    columnPosition!: number;

    @IsInt()
    @Min(1)
    databaseId!: number;
}

/** Wide-pivot branch: each column in `columnsMapping` holds the value for one element id. */
export class MultipleElementColumns {
    @ValidateNested({ each: true })
    @Type(() => ElementColumnMapping)
    columnsMapping!: ElementColumnMapping[];
}

/**
 * Element column specification.
 *
 * Discriminated shape: exactly one of `noElement`, `singleColumn`, or `multipleColumns`
 * must be set. The wrapper `hasElement` from the old shape has been removed — the
 * 3-way choice is now flat and matches the orthogonal style used by `DateTimeDefinition`.
 *
 * - `noElement`        — the file has no element column; every observation gets a default element id.
 * - `singleColumn`     — one column holds the element id for each row, with optional source→database id mapping.
 * - `multipleColumns`  — wide pivot: each column in `columnsMapping` holds the observation value for one
 *                       database element id. The mapping is explicit (not contiguous range)
 *                       because column positions don't naturally map to element ids.
 *                       Produces the `value` column itself — no separate `valueDefinition` needed.
 */
export class ElementDefinition {
    @IsOptional()
    @ValidateNested()
    @Type(() => NoElementConfig)
    noElement?: NoElementConfig;

    @IsOptional()
    @ValidateNested()
    @Type(() => SingleElementColumn)
    singleColumn?: SingleElementColumn;

    @IsOptional()
    @ValidateNested()
    @Type(() => MultipleElementColumns)
    multipleColumns?: MultipleElementColumns;

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

// ─── DateTimeDefinition: orthogonal date × time model ────────────────────
//
// A datetime is either:
//   - combinedColumn — a single column with both date and time as one string
//                      parsed by a DateTimeFormat (e.g. ISO 8601), OR
//   - separated      — date and time live in different file columns and each
//                      is configured independently.
//
// Inside `separated`, the date part chooses between a single date column and
// year/month/day columns (where the day position can itself be a single column
// or a wide range — days-as-columns). The time part chooses between a default
// hour, a single time column, two columns for hour and minute, or a wide range
// of hour columns.
//
// Wide-pivot constraint: at most one of {dayColumns.columnsRange,
// time.hourColumnsRange} can be present, because each wide pivot produces the
// `value` column and the transformer can only do one such pivot per file.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Day columns inside a year/month/day date layout.
 *
 * - `singleColumn`  — one column whose cell value IS the day number (1..31).
 * - `columnsRange`  — a contiguous range of file columns, one per day-of-month.
 *                     The cell value is the observation value; the column index
 *                     is mapped back to the day number. Acts as a wide UNPIVOT.
 */
export class DayColumns {
    @IsOptional()
    singleColumn?: {
        columnPosition: number;
    };

    @IsOptional()
    columnsRange?: {
        firstColumnPosition: number;
        lastColumnPosition: number;
    };
}

/**
 * Date part of a separated datetime.
 *
 * - `singleColumn`        — one column with date as a string parsed by a DateFormat.
 * - `yearMonthDayColumns` — year, month, and day each in their own columns.
 *                           The day part can itself be a single column or a wide range.
 */
export class DatePart {
    @IsOptional()
    singleColumn?: {
        columnPosition: number;
        dateFormat: DateFormat;
    };

    @IsOptional()
    @ValidateNested()
    @Type(() => DayColumns)
    yearMonthDayColumns?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumns: DayColumns;
    };
}

/**
 * Time part of a separated datetime.
 *
 * - `defaultHour`           — no time in the file; supply a default hour.
 * - `singleColumn`          — one column with time as a string parsed by a TimeFormat.
 * - `hourAndMinuteColumns`  — hour and minute in two separate file columns.
 * - `hourColumnsRange`      — a contiguous range of file columns, one per hour-of-day.
 *                             Wide UNPIVOT. Cannot combine with `dayColumns.columnsRange`.
 */
export class TimePart {
    @IsOptional()
    defaultHour?: {
        hour: number;
    };

    @IsOptional()
    singleColumn?: {
        columnPosition: number;
        timeFormat: TimeFormat;
    };

    @IsOptional()
    hourAndMinuteColumns?: {
        hourColumnPosition: number;
        minuteColumnPosition: number;
    };

    @IsOptional()
    hourColumnsRange?: {
        firstColumnPosition: number;
        lastColumnPosition: number;
    };
}

export class DateTimeDefinition {

    /** A single column contains both date and time (e.g. '2024-01-15T08:00:00'). */
    @IsOptional()
    combinedColumn?: {
        columnPosition: number;
        datetimeFormat: DateTimeFormat;
    };

    /** Date and time live in different file columns; each side is configured independently. */
    @IsOptional()
    separated?: {
        date: DatePart;
        time: TimePart;
    };
}

export class ImportSourceTabularParamsDto {
    /** Whether to fetch station and its column position */
    @IsOptional()
    @ValidateNested()
    @Type(() => StationDefinition)
    stationDefinition?: StationDefinition;

    /**elements and value definition*/
    @ValidateNested()
    @Type(() => ElementDefinition)
    elementDefinition!: ElementDefinition;

    /** Interval of the observation */
    @ValidateNested()
    @Type(() => IntervalDefinition)
    intervalDefinition!: IntervalDefinition;

    /** Whether to fetch level and its column position */
    @ValidateNested()
    @Type(() => LevelDefinition)
    levelDefinition!: LevelDefinition;

    /** Date time columns and formats */
    @ValidateNested()
    @Type(() => DateTimeDefinition)
    datetimeDefinition!: DateTimeDefinition;

    @IsOptional()
    @ValidateNested()
    @Type(() => ValueDefinition)
    valueDefinition?: ValueDefinition;

    @IsOptional()
    @ValidateNested()
    @Type(() => CommentDefinition)
    commentDefinition?: CommentDefinition;

    /**
     * Number of rows to skip.
     */
    @IsInt()
    @Min(0)
    rowsToSkip!: number;

    /**
     * Applies to csv file formats onl e.g CSV, DAT, TSV.
     */
    @IsOptional()
    @IsString()
    delimiter?: string
}
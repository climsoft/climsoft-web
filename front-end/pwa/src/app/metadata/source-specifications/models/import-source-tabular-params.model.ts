import { FlagEnum } from "../../../data-ingestion/models/flag.enum";

export interface FlagDefinition {
    flagColumnPosition: number;
    flagsToFetch?: { sourceId: string, databaseId: FlagEnum }[];
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

export type DateTimeFormatTypes = '%Y-%m-%d %H:%M:%S' |
    '%Y-%m-%d %H:%M' |
    '%Y-%m-%d' |
    '%d-%m-%Y %H:%M:%S' |
    '%d-%m-%Y %H:%M' |
    '%d-%m-%Y' |
    '%Y/%m/%d %H:%M:%S' |
    '%Y/%m/%d %H:%M' |
    '%Y/%m/%d' |
    '%d/%m/%Y %H:%M:%S' |
    '%d/%m/%Y %H:%M' |
    '%d/%m/%Y';

export type DateFormatTypes = '%Y-%m-%d' | '%d-%m-%Y' | '%Y/%m/%d' | '%d/%m/%Y';

export type TimeFormatTypes = '%H:%M:%S' | '%H:%M' | '%-H:%M' | '%H' | '%-H';

export interface DateTimeDefinition {

    /** A single column contains both date and time (e.g. '2024-01-15 08:00:00'). */
    dateTimeInSingleColumn?: {
        columnPosition: number;
        datetimeFormat: DateTimeFormatTypes;
    };

    /** A single column contains only the date. A default hour supplies the time component. */
    dateInSingleColumn?: {
        columnPosition: number;
        dateFormat: DateFormatTypes;
        defaultHour: number;
    };

    /** Date and time are in two separate columns. */
    dateTimeInTwoColumns?: {
        dateColumnPosition: number;
        dateFormat: DateFormatTypes;
        timeColumnPosition: number;
        timeFormat: TimeFormatTypes;
    };

    /** Date and time are split across year, month, day and time columns. */
    dateTimeInMultipleColumns?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumnPosition: string; // For multiple columns format will be like columnPosX-columnPosY
        timeColumnPosition: number;
        timeFormat: TimeFormatTypes;
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
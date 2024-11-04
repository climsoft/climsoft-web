import { FlagEnum } from "../../../core/models/observations/flag.enum";
import { DataStructureValidity } from "./create-import-source.model";

export interface ImportTabularSourceModel extends  DataStructureValidity{

    /** Whether to fetch station and its column position */
    stationDefinition?: StationDefinition;

    /**Whether to include elements or not */
    elementAndValueDefinition: ElementAndValueDefinition;

    /** Period of the observation */
    periodDefinition: PeriodDefinition;

    /** Whether to fetch elevation and its column position */
    elevationColumnPosition?: number;

    /** Date time columns and formats */
    datetimeDefinition: DateTimeDefinition;

    /**
     * Number of rows to skip.
     */
    rowsToSkip: number;

    /**
    * Applies to csv file formats onl e.g CSV, DAT, TSV.
    */
    delimiter?: ',' | '|'; // TODO find a way of including \t. This should eventually be an enumerator

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
export interface ElementAndValueDefinition {

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
            valueColumnPosition: number,
            flagDefinition?: FlagDefinition
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
         * The element id in the database. 
         */
        databaseId: number,

        /**
         * Value column position.
         */
        valueColumnPosition: number,

        /** Flag column position. Optional */
        flagDefinition?: FlagDefinition,
    };

}

/**
 * When columnPosition is not specified then the defaultPeriod should be specified, that is, 
 * either columnPosition or defaultPeriod must be provided, but not both.
 */
export interface PeriodDefinition {
    columnPosition?: number;
    defaultPeriod?: number;
}

export interface FlagDefinition {
    flagColumnPosition: number;
    flagsToFetch?: { sourceId: string, databaseId: FlagEnum }[];
}

/**
 * When dateTimeColumnPostion is not specified then  dateInMultipleColumn should be specified, that is,
 * either dateTimeColumnPostion or dateInMultipleColumn must be provided, but not both.
 */
export interface DateTimeDefinition {

    /**
     * The date time column position
     * Expected format: 'yyyy-mm-dd hh:mm:ss'
     */
    dateTimeColumnPostion?: number;

    dateTimeInMultipleColumn?: {

        dateInSingleColumn?: {
            dateColumnPosition: number,
            // yyyy-mm-dd, yyyy/mm/dd,
            // dd-mm-yyyy, dd/mm/yyyy,
            // iso dateformat that is, yyyy-mm-dd hh:mm:ss
            datetimeFormat: 'yyyy-mm-dd hh:mm:ss' | 'yyyy-mm-dd' | 'yyyy/mm/dd' | 'dd-mm-yyyy' | 'dd/mm/yyyy',
        },

        dateInMultipleColumn?: {
            yearColumnPosition: number,
            monthColumnPosition: number,
            dayColumnPosition: number
        },

        hourDefinition: HourDefinition
    };

}

/**
 * Either hourColumnPosition or defaultHour must be provided, but not both.
 */
export class HourDefinition {
    /**
     * If provided, then defaultHour will not be used.
     */
    columnPosition?: number;

    /**
     * Should be provided when hourColumnPosition is not provided.
     */
    defaultHour?: number;
}
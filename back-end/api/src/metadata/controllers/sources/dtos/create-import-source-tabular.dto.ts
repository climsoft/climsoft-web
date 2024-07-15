import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateImportSourceDTO } from "./create-import-source.dto";

export class CreateImportTabularSourceDTO implements CreateImportSourceDTO {

    format: "TABULAR" | "KEYVALUE"= "TABULAR";

    /** Whether to fetch station and its column position */
    stationDefinition?: StationDefinition;

    /**elements and value definition*/
    elementAndValueDefinition: ElementAndValueDefinition;

    /** Period of the observation */
    periodDefinition: PeriodDefinition;

    /** Whether to fetch elevation and its column position */
    @IsNumber()
    elevationColumnPosition?: number;

    /** Date time columns and formats */
    datetimeDefinition: DateTimeDefinition;

    /**Determines the UTC difference. When zero, no conversion of dates will be done */
    @IsInt()
    utcDifference: number;

    /**
     * Determines whether to scale the values. 
     * To be used when data being imported is not scaled
     */
    @IsBoolean()
    scaleValues: boolean;

    /**
     * Number of rows to skip.
     */
    @IsInt()
    rowsToSkip: number;

    /**
     * Applies to csv file formats onl e.g CSV, DAT, TSV.
     */
    @IsString()
    delimiter?: ',' | '|'; // TODO find a way of including \t

    @IsOptional()
    @IsString()
    sampleImage: string;

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
    columnPosition: number;

    /**
     * Represents stations to fetch and matches the source ids to the database element ids. 
     * It is optional, meaning fetch all as valid database station ids.
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
export class ElementAndValueDefinition {

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
            flagColumnPosition?: number
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
        flagColumnPosition?: number,
    };



}

/**
 * When columnPosition is not specified then the defaultPeriod should be specified, that is, 
 * either columnPosition or defaultPeriod must be provided, but not both.
 */
export class PeriodDefinition {
    columnPosition?: number;
    defaultPeriod?: number;
}

/**
 * When dateTimeColumnPostion is not specified then  dateInMultipleColumn should be specified, that is,
 * either dateTimeColumnPostion or dateInMultipleColumn must be provided, but not both.
 */
export class DateTimeDefinition {

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
    @IsInt()
    columnPosition?: number;

    /**
     * Should be provided when hourColumnPosition is not provided.
     */
    @IsInt()
    defaultHour?: number;
}
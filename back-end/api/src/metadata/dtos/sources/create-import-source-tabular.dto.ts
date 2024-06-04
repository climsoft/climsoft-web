
export class CreateImportTabularSourceDTO {

    /** Whether to fetch station and its column position */
    stationColumnPosition?: number;

    /**Whether to include elements or not */
    elementStructure?: ElementStructure;

    /** Period of the data */
    period: PeriodStructure;

    /** Whether to fetch elevation and its column position */
    elevationColumnPosition?: number;

    datetimeStructure: DateTimeStructure;

    valueColumnPosition: number;

    /** Whether to fetch flag and its column position */
    flagColumnPosition?: number;

    /**Determines the UTC difference. When zero, no conversion of dates will be done */
    utcDifference: number;

    /**
     * Determines whether to scale the values. 
     * To be used when data being imported is not scaled
     */
    scaleValues: boolean;

    rowsToSkip: number;

    delimiters: string;

}

/**
 * Element column is optional.
 * If specified, it must be either a single or multiple columns.
 */
export class ElementStructure {

    /**
     * Used when there is only a single element column. 
     */
    elementsInSingleColumn?: {
        /**
         * Represents the column position.
         */
        columnPosition: number,

        /**
         * Represents elements to fetch and matches the source ids to the database element ids. 
         * It is optional, meaning fetch all as database element ids.
         */
        elementsToFetch?: { sourceElementId: string, dbElementId: number }[]
    };

    /**
     * Used when elements columns are multiple.
     */
    elementsInMultipleColumns?: {
        /**
        * Represents the column position.
        */
        columnPosition: number,

        /**
         * Represents the corresponding database element id
         */
        dbElementId: number
    };

}

/**
 * Period must be specified.
 * Period column is optional. When period column is not specified then the default period should be specified.
 */
export class PeriodStructure {
    columnPosition?: number;
    defaultPeriod?: number;

}



export class DateTimeStructure {

    // yyyy-mm-dd, yyyy/mm/dd,
    // dd-mm-yyyy, dd/mm/yyyy,
    // yyyy-mm, yyyy/mm
    // mm-yyyy, mm/yyyy
    // dateformat hh:mm:ss
    datetimeFormat?: string;

    datetimeColumnPosition?: number;

    dateColumnPosition: number;

    yearColumnPosition: number | null;
    monthColumnPosition: number | null;

    dayColumnPosition?: number | null;

    hourColumnPosition?: number | null;

    defaultHour?: number;


}
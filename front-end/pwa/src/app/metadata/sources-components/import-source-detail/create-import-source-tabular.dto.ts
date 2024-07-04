

export interface CreateImportTabularSourceModel {

    /** Whether to fetch station and its column position */
    stationDefinition?: StationDefinition;

    /**Whether to include elements or not */
    elementDefinition: ElementAndValueDefinition;

    /** Period of the observation */
    periodDefinition: PeriodDefinition;

    /** Whether to fetch elevation and its column position */
    elevationColumnPosition?: number;

    /** Date time columns and formats */
    datetimeDefinition: DateTimeDefinition;

    /**Determines the UTC difference. When zero, no conversion of dates will be done */
    utcDifference: number;

    /**
     * Determines whether to scale the values. 
     * To be used when data being imported is not scaled
     */
    scaleValues: boolean;

    /**
     * Number of rows to skip.
     */
    rowsToSkip: number;

    /**
     * Auto applies to all tabular file formats like CSV, XLXS.
     * The others apply to CSV files only
     */
    delimiters: 'auto' | ',' | '|';

    sampleImage: string;

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
        sourceStationId: string,
        dbStationId: string
    }[];

}

/**
 * Element and Value column specifications.
 * Must be either a single or multiple columns.
 */
export interface ElementAndValueDefinition {

    /**
     * Used when there is only a single element column. 
     */
    elementsInSingleColumn?: {
        /**
         * Represents the column position.
         */
        elementColumnPosition: number,

        /**
         * Represents elements to fetch and matches the source ids to the database element ids. 
         * It is optional, meaning fetch all as database element ids.
         */
        elementsToFetch?: { sourceElementId: string, dbElementId: number }[];

        /**
         * Value column position of the observation.
        */
        valueColumnPosition: number;

        /** Flag column position. Optional */
        flagColumnPosition?: number;
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
    }[];

}

/**
 * When columnPosition is not specified then the defaultPeriod should be specified, that is, 
 * either columnPosition or defaultPeriod must be provided, but not both.
 */
export interface PeriodDefinition {
    columnPosition?: number;
    defaultPeriod?: number;
}

/**
 * When dateInSingleColumn is not specified then  dateInMultipleColumn should be specified, that is,
 * either dateInSingleColumn or dateInMultipleColumn must be provided, but not both.
 */
export interface DateTimeDefinition {

    dateInSingleColumn?: {

        dateColumnPosition: number;

        // yyyy-mm-dd, yyyy/mm/dd,
        // dd-mm-yyyy, dd/mm/yyyy,
        // iso dateformat that is, yyyy-mm-dd hh:mm:ss
        datetimeFormat: 'yyyy-mm-dd hh:mm:ss' | 'yyyy-mm-dd' | 'yyyy/mm/dd' | 'dd-mm-yyyy' | 'dd/mm/yyyy';

        /**
         * If datetimeFormat is 'yyyy-mm-dd hh:mm:ss' then the hourStructure will not be used.
         * If datetimeFormat is NOT 'yyyy-mm-dd hh:mm:ss' then the hourStructure must be provided.
         */
        hourStructure?: HourDefinition;
    };

    dateInMultipleColumn?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumnPosition: number;
        hourStructure: HourDefinition;
    };

}

/**
 * Either hourColumnPosition or defaultHour must be provided, but not both.
 */
export class HourDefinition {
    /**
     * If provided, then defaultHour will not be used.
     */
    hourColumnPosition?: number;

    /**
     * Should be provided when hourColumnPosition is not provided.
     */
    defaultHour?: number;
}
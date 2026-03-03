import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { FlagEnum } from "src/observation/enums/flag.enum";


/**
 * When columnPosition is not specified then the defaultValue should be specified, that is, 
 * either columnPosition or defaultValue must be provided, but not both.
 */
export class IntervalDefinition {
    @IsOptional()
    @IsInt()
    @Min(1)
    columnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1) // 1 minute should be the lowest
    defaultValue?: number;
}

/**
 * When columnPosition is not specified then the defaultValue should be specified, that is, 
 * either columnPosition or defaultValue must be provided, but not both.
 */
export class LevelDefinition {
    @IsOptional()
    @IsInt()
    @Min(1)
    columnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(0) // Zero should be the lowest
    defaultValue?: number;
}

export class FlagDefinition {
    @IsInt()
    @Min(1)
    flagColumnPosition: number;

    @IsOptional()
    flagsToFetch?: { sourceId: string; databaseId: FlagEnum }[];
}

export class ValueDefinition {
    /** Value column position. */
    @IsInt()
    @Min(1)
    valueColumnPosition: number;

    /** Flag column position. Optional */
    @IsOptional()
    @ValidateNested()
    @Type(() => FlagDefinition)
    flagDefinition?: FlagDefinition;
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
    columnPosition: number;

    /**
     * Represents stations to fetch and matches the source ids to the database element ids. 
     * It is optional, meaning fetch all as valid database station ids.
     */
    @IsOptional()
    stationsToFetch?: {
        sourceId: string;
        databaseId: string;
    }[];

}

/**
 * Element and Value column specifications.
 * 
 */
export class ElementDefinition {

    /**
    * Used when there are elements.
    * Must be either a single or multiple columns.
    */
    @IsOptional()
    hasElement?: {
        /**
         *  Used when elements are in a single column.
         */
        singleColumn?: {

            elementColumnPosition: number;

            /**
             * The elements to fetch and matches the source ids to the database element ids. 
             * It is optional, meaning fetch all as database element ids.
             */
            elementsToFetch?: { sourceId: string; databaseId: number; }[],
        },

        /**
         *  Used when elements are in multiple columns.
         */
        multipleColumn?: {

            /**
            * Represents the column position.
            */
            columnPosition: number;

            /**
             * Represents the corresponding database element id
             */
            databaseId: number;
        }[]
    };

    /**
     * Used when there is no element.
     */
    @IsOptional()
    noElement?: {
        /**
         * The element id in the database. 
         */
        databaseId: number;
    };

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

/**
 * Either time column or default hour must be provided, but not both.
 */
export class HourDefinition {

    /**
    * If provided, then default hour will not be used.
    */
    @IsOptional()
    timeColumn?: {
        columnPosition: number;
        timeFormat: TimeFormatTypes;
    };

    /**
     * Should be provided when time column is not provided.
     */
    @IsOptional()
    @IsInt()
    @Min(0)
    defaultHour?: number;
}

export class DateTimeDefinition {

    /**
    * The date time column position
    * Expected format example: 'yyyy-mm-dd hh:mm:ss'
    */
    @IsOptional()
    dateTimeInSingleColumn?: {
        columnPosition: number;
        datetimeFormat: DateTimeFormatTypes;
    };

    /**
     * The date and time are in two separate columns.
     */
    @IsOptional()
    dateTimeInTwoColumns?: {
        dateColumn: {
            columnPosition: number;
            dateFormat: DateFormatTypes;
        };
        timeColumn: {
            columnPosition: number;
            timeFormat: TimeFormatTypes;
        };
    };

    /**
     * The date and time are split across multiple columns (e.g., Year, Month, Day, Hour).
     */
    @IsOptional()
    dateTimeInMultipleColumns?: {
        yearColumnPosition: number;
        monthColumnPosition: number;
        dayColumnPosition: string; // For multiple columns format will be like columnPosX-columnPosY
        hourDefinition: HourDefinition;
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
    elementDefinition: ElementDefinition;

    /** Interval of the observation */
    @ValidateNested()
    @Type(() => IntervalDefinition)
    intervalDefinition: IntervalDefinition;

    /** Whether to fetch level and its column position */
    @ValidateNested()
    @Type(() => LevelDefinition)
    levelDefinition: LevelDefinition;

    /** Date time columns and formats */
    @ValidateNested()
    @Type(() => DateTimeDefinition)
    datetimeDefinition: DateTimeDefinition;

    @IsOptional()
    @ValidateNested()
    @Type(() => ValueDefinition)
    valueDefinition?: ValueDefinition;

    @IsOptional()
    @IsInt()
    @Min(1)
    commentColumnPosition?: number;

    /**
     * Number of rows to skip.
     */
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    /**
     * Applies to csv file formats onl e.g CSV, DAT, TSV.
     */
    @IsOptional()
    @IsString()
    delimiter?: ',' | '|'; // TODO find a way of including \t. This should eventually be an enumerator
}
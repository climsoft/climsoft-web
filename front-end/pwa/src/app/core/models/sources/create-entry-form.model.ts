
export type ExtraSelectorControlType = 'ELEMENT' | 'DAY' | 'HOUR';
export type FieldType = 'ELEMENT' | 'DAY' | 'HOUR';
export type LayoutType = 'LINEAR' | 'GRID';

export interface CreateEntryFormModel {
    /** Defines the extra entry selectors used by the form to get data */
    selectors: [ExtraSelectorControlType, ExtraSelectorControlType?];

    /** Defines the entry fields used by the form to display and enter data */
    fields: [FieldType, FieldType?];

    /** Layout used by entry fields */
    layout: LayoutType;

    /** Elements ids allowed to be recorded by the form */
    elementIds: number[];

    /** Hours allowed to be recorded by the form */
    hours: number[];

    /** Period for observation */
    period: number;

    /** 
     * Determines whether entry date time should be converted to UTC or not. 
     * If true, the entry date time will be sent to the server based on date time selection on the lcient
     * If false, entry date time will be converted to UTC before being sent to sever
     */
    utcDifference: number;

    /** 
     * Determines whether to allow entries that don't pass observation limits.
     * If true, when limits are exceeded, data entry will not be allowed.
     */
    enforceLimitCheck: boolean;

    /**
     * Determines whether to allow missing values or not.
     * If true, entry of missing values will be allowed.
     */
    allowMissingValue: boolean;

    /**
     * Determines whether user is required to type in observation total or not.
     */
    requireTotalInput: boolean;

    /** Sample paper image that resembles the form design */
    sampleImage: string;
}

export enum SelectorFieldControlType {
  ELEMENT = 'ELEMENT',
  DAY = 'DAY',
  HOUR = 'HOUR'
}

export enum LayoutType {
  LINEAR = 'LINEAR',
  GRID = 'GRID'
}

export interface FormSourceModel {
    /** Defines the extra entry selectors used by the form to get data */
    selectors: [SelectorFieldControlType, SelectorFieldControlType?];

    /** Defines the entry fields used by the form to display and enter data */
    fields: [SelectorFieldControlType, SelectorFieldControlType?];

    /** Layout used by entry fields */
    layout: LayoutType;

    /** Elements ids allowed to be recorded by the form */
    elementIds: number[];

    /** Hours allowed to be recorded by the form */
    hours: number[];

    /** Interval for observation */
    interval: number;

    /**
     * Determines whether user is required to type in observation total or not.
     * Note, this is only enforced on the front end.
     */
    requireTotalInput?: boolean;

    allowEntryAtStationOnly?: boolean;

    allowStationSelection?: boolean;

    allowDoubleDataEntry?: boolean;

}
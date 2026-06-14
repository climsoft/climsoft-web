
export enum SelectorFieldControlType {
  ELEMENT = 'ELEMENT',
  DAY = 'DAY',
  HOUR = 'HOUR'
}

export enum LayoutType {
  LINEAR = 'LINEAR',
  GRID = 'GRID'
}

/** Per-element configuration on a form. */
export interface FormElementMetadata {
    /** Element id allowed on the form. */
    elementId: number;

    /**
     * Hours at which this element is enabled.
     * - `null` means the element inherits the form's `hours` (enabled at every form hour).
     * - A non-empty array MUST be a subset of `FormSourceModel.hours`.
     * - An empty array is not valid and should be rejected at the dialog/DTO layer.
     */
    hours: number[] | null;
}

export interface FormSourceModel {
    /** Defines the extra entry selectors used by the form to get data */
    selectors: [SelectorFieldControlType, SelectorFieldControlType?];

    /** Defines the entry fields used by the form to display and enter data */
    fields: [SelectorFieldControlType, SelectorFieldControlType?];

    /** Layout used by entry fields */
    layout: LayoutType;

    /** Per-element configuration for elements allowed on the form. */
    elementsMetadata: FormElementMetadata[];

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


export type SelectorType = 'ELEMENT' | 'YEAR' |'MONTH'| 'DAY' | 'HOUR';
export type SelectorsType = [SelectorType,SelectorType,SelectorType, SelectorType?];

export type FieldType = 'ELEMENT' | 'DAY' | 'HOUR';
export type FieldsType = [FieldType, FieldType?];

export type LayoutType = 'LINEAR' | 'GRID';


export interface EntryForm {

    //defines the entry selectors used by the form to get data
    //allowed values, array of ; element, year, month, day, hour e.
    selectors: SelectorsType;

    //defines the entry fields used by the form to display data
    //can only contain elementId, day or hour
    fields: FieldsType;

    //control to be used for entry fields in data entry and data display
    layout: LayoutType;

    //elements ids allowed to be recorded by the form
    elements: number[];

    //hours allowed to be recorded by the form
    hours: number[];

    //whether to scale the entry or not
    scale: boolean;

    //whether user should type in observation total, mean or not
    //allowed values; total, mean
    validations: string;

    //sample paper
    samplePaperImage: string;

}
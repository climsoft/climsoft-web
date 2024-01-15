
export type EntryType = 'ELEMENT' | 'DAY' | 'HOUR';
//export type EntrysType = [EntryType, EntryType?];

export type LayoutType = 'LINEAR' | 'GRID';


export interface EntryForm {

    //defines the extra entry selectors used by the form to get data
    selectors: [EntryType, EntryType?];

    //defines the entry fields used by the form to display and enter data
    fields: [EntryType, EntryType?];

    //layout used by entry fields
    layout: LayoutType;

    //elements ids allowed to be recorded by the form
    elementIds: number[];

    //hours allowed to be recorded by the form
    hours: number[];

    //period for observation
    period: number;

    //whether user should type in observation total
    validateTotal: boolean;

    //sample paper
    samplePaperImage: string;

}
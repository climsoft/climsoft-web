
export type ExtraSelectorControlType = 'ELEMENT' | 'DAY' | 'HOUR'; //todo. convert this to enums?
export type LayoutType = 'LINEAR' | 'GRID'; //todo. convert this to enums?

export interface EntryForm {

    //defines the extra entry selectors used by the form to get data
    selectors: [ExtraSelectorControlType, ExtraSelectorControlType?];

    //defines the entry fields used by the form to display and enter data
    fields: [ExtraSelectorControlType, ExtraSelectorControlType?];

    //layout used by entry fields
    layout: LayoutType;

    //elements ids allowed to be recorded by the form
    elementIds: number[];

    //hours allowed to be recorded by the form
    hours: number[];

    // period for observation
    period: number;

    // whether entry date time should be converted to UTC. 
    // Some forms don't require this because the date time on the physical form is alreday in UTC.
    convertDateTimeToUTC: boolean;

    allowDataEntryOnLimitCheckInvalid: boolean;

    //whether user should type in observation total
    validateTotal: boolean;

    //sample paper
    samplePaperImage: string;

}
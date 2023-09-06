export  interface EntryForm{

    //defines the entry selectors used by the form to get data
    //allowed values; station, element, year, month, day, hour e.
    entrySelectors: string[];

    //defines the entry fields used by the form to display data
    entryFields: string[];

    //control to be used for entry fields in data entry and data display
    entryControl: string;

    //elements ids allowed to be recorded by the form
    elements: number[];
    
    //hours allowed to be recorded by the form
    hours: number[]; 

    //the scale used for entering the data
    scale: number;

    //whether user should type in observation total, mean or not
    //allowed values; total, mean
    formValidations: string;

    //sample paper
    samplePaperImage: string;     

}
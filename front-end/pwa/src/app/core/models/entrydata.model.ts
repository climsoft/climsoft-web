export interface EntryData {
    stationId: string;
    elementId: number;
    dataSourceId: number;
    level: string;
    datetime: string;
    value: number | null; 
    flag: string | null;    
    //status of quality check.
    //0 is no QC. If QC > 0 if QC has been done.
    qcStatus: number| null;

    //json array string.
    //sample structure.
    // [   {
    //     "user": "clerk_1", 
    //     "value": 200, 
    //     "flag": "D",
    //     "paper_image": "image1", 
    //     "comment": "initial entry"
    //     },
    //     {
    //     "user": "clerk_2", 
    //     "value": 320,
    //     "flag": "D",
    //     "paper_image": "image1", 
    //     "comment": "second entry"
    //     } 
    // ]  

    changesLog: string; //json string




}
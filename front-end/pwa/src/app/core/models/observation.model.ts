export interface Observation {
    stationId: string;
    elementId: number;
    sourceId: number;
    level: string;
    datetime: string; 
    period: number; 
    value: number | null;  
    flag: string | null;
    qcStatus: number;
    entryUser?: number
    entryDateTime?: Date;

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

    //changesLog: string; //json string




}

export interface ObservationLog {
    period: number;
    value: number | null;
    flag: number | null; 
    entryUser: number  
    entryDateTime: string;
    comment: string;
}
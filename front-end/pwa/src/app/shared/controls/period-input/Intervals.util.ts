export class IntervalsUtil {
    // TODO. Because of monthly and yearly, 
    // these should be changed to enums, the the api will translate the enums to their correct minute interval.
    // When querying the database, the API should be able to know that months vary from 28 to 31 days and yearly vary from 365 to 366
    public static possibleIntervals: Interval[] = [
        { id: 5, name: "5 mins" },
        { id: 10, name: "10 mins" },
        { id: 15, name: "15 mins" },
        { id: 30, name: "30 mins" },
        { id: 60, name: "1 hr" },
        { id: 180, name: "3 hrs" },
        { id: 360, name: "6 hrs" },
        { id: 720, name: "12 hrs" },
        { id: 1440, name: "Daily" },
        { id: 2880, name: "2 Days" },
        { id: 1080, name: "Weekly" },
        { id: 14400, name: "Dekadal" },
        { id: 44640, name: "Monthly" }, // TODO. Abandon use of minutes at fron end level
        { id: 527040, name: "Yearly" }, // TODO. Abandon use of minutes at fron end level
    ];

    public static findInterval(minutes: number): Interval | undefined {
        return this.possibleIntervals.find(item => item.id === minutes)
    }

    public static getIntervalName(minutes: number): string {
        const intervalFound = IntervalsUtil.findInterval(minutes);
        return intervalFound ? intervalFound.name : minutes + 'mins';
    }
}

export interface Interval {
    id: number;
    name: string;
}
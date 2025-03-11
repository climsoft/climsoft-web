export class IntervalsUtil {
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
        { id: 14400, name: "Dekadal" },
        { id: 40320, name: "28 Days" },
        { id: 41760, name: "29 Days" },
        { id: 43200, name: "30 Days" },
        { id: 44640, name: "31 Days" },
        { id: 525600, name: "365 Days" },
        { id: 527040, name: "366 Days" }
    ];

    public static findInterval(minutes: number): Interval | undefined {
        return this.possibleIntervals.find(item => item.id === minutes)
    }
}

export interface Interval {
    id: number;
    name: string;
}
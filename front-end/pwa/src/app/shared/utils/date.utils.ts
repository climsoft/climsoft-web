import { StringUtils } from "./string.utils";

export class DateUtils {

    //takes a 0 based index (month id) and returns the number of days in that month
    static getDaysInMonthList(year: number, month: number): { [key: string]: any }[] {
        const allDays: { [key: string]: any }[] = [];
        const lastDay: number = new Date(year, month, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            allDays.push({ id: i, name: `Day ${i.toString().padStart(2, '0')}` });
        }
        return allDays;
    }

    static getHours(hourIds?: number[]): { [key: string]: any }[] {
        const allHours: { [key: string]: any }[] = [];
        for (let i = 0; i <= 23; i++) {
            allHours.push({ id: i, name: `Hour ${i.toString().padStart(2, '0')}` });
        }

        if (hourIds) {
            return allHours.filter(hour => hourIds.includes(hour["id"]));
        }
        return allHours;
    }

    static getDateInSQLFormat(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
        return `${year.toString()}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)} ${StringUtils.addLeadingZero(hour)}:${StringUtils.addLeadingZero(minute)}:${StringUtils.addLeadingZero(second)}`
    }

}



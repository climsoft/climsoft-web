import { StringUtils } from "./string.utils";

export class DateUtils {

    /**
     * 
     * @param year 
     * @param month Month is 1-indexed (1 for January, 2 for February, etc.)
     * @returns 
     */
    static getDaysInMonthList(year: number, month: number): { [key: string]: any }[] {
        const allDays: { [key: string]: any }[] = [];
        const lastDay: number = DateUtils.getLastDayOfMonth(year,month);
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

    /**
     * 
     * @param year 
     * @param month Month is 1-indexed (1 for January, 2 for February, etc.)
     * @returns 
     */
    static getLastDayOfMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }

    static getTodayDateInSQLFormat(): string {
        const date = new Date();
        return DateUtils.getDateInSQLFormat(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    }

    //takes a one-based month based
    static getDateInSQLFormat(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
        return `${year.toString()}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)} ${StringUtils.addLeadingZero(hour)}:${StringUtils.addLeadingZero(minute)}:${StringUtils.addLeadingZero(second)}`
    }

    static getDayFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(8, 10));
    }

    static getHourFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(11, 13));
    }



}



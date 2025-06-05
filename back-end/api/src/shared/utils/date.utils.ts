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
        const lastDay: number = DateUtils.getLastDayOfMonth(year, month);
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
        // The zero day will make the date object to automatically roll back to the last day of the previous month
        return new Date(year, month + 1, 0).getDate();
    }

    static getTodayDateInSQLFormat(): string {
        const date = new Date();
        return DateUtils.getDateInSQLFormat(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    }

    //takes a one-based month based
    static getDateInSQLFormat(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
        return `${year.toString()}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)} ${StringUtils.addLeadingZero(hour)}:${StringUtils.addLeadingZero(minute)}:${StringUtils.addLeadingZero(second)}`
    }

    public static getDateInSQLFormatFromDate(date: Date, useUTC: boolean): string {
        const pad = (num: number): string => num.toString().padStart(2, '0');
        const getYear = useUTC ? date.getUTCFullYear() : date.getFullYear();
        const getMonth = pad((useUTC ? date.getUTCMonth() : date.getMonth()) + 1); // getMonth() is zero-based
        const getDay = pad(useUTC ? date.getUTCDate() : date.getDate());
        const getHours = pad(useUTC ? date.getUTCHours() : date.getHours());
        const getMinutes = pad(useUTC ? date.getUTCMinutes() : date.getMinutes());
        const getSeconds = pad(useUTC ? date.getUTCSeconds() : date.getSeconds());
        const getMilliseconds = (useUTC ? date.getUTCMilliseconds() : date.getMilliseconds()).toString().padStart(3, '0');

        return `${getYear}-${getMonth}-${getDay} ${getHours}:${getMinutes}:${getSeconds}.${getMilliseconds}`;
    }

    static getDayFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(8, 10));
    }

    static getHourFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(11, 13));
    }

    public static getDatetimesBasedOnUTCOffset(strDateTimeInJavaScriptIso: string, utcOffset: number, operation: 'subtract' | 'add'): string {
        if (utcOffset === 0) return strDateTimeInJavaScriptIso;
        const newDate: Date = new Date(strDateTimeInJavaScriptIso);
        if (operation === 'subtract') {
            newDate.setHours(newDate.getHours() - utcOffset);
        } else {
            newDate.setHours(newDate.getHours() + utcOffset);
        }
        return newDate.toISOString();
    }

    public static getHourBasedOnUTCOffset(hour: number, utcOffset: number, operation: 'subtract' | 'add'): number {
        if (utcOffset === 0) return hour;

        // Important wrap negative adjusted hours to positive before wrapping the hoour to 24 hour range
        if (operation === 'subtract') {
            return ((hour - utcOffset) + 24) % 24;
        } else {
            return ((hour + utcOffset) + 24) % 24;
        }
    }


    /**
  * returns the date part only as string.
  * Uses local timezone
  * @param date 
  * @returns 
  */
    public static getDateOnlyAsString(date: Date): string {
        // Note, don't use toISO here because the user sees the date in the local timezone
        return `${date.getFullYear()}-${StringUtils.addLeadingZero(date.getMonth() + 1)}-${StringUtils.addLeadingZero(date.getDate())}`;
    }



}



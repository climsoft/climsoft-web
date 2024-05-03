import { StringUtils } from "./string.utils";

export class DateUtils {

    /**
     * 
     * @param year 
     * @param month Month is 0-indexed (0 for January, 11 for December)
     * @param prefix 
     * @returns 
     */
    static getDaysInMonthList(year: number, monthIndex: number, prefix?: string): { id: number, name: string }[] {
        const allDays: { id: number, name: string }[] = [];
        const lastDay: number = DateUtils.getLastDayOfMonth(year, monthIndex);

        if (prefix === undefined) {
            prefix = "Day "
        }

        for (let i = 1; i <= lastDay; i++) {
            allDays.push({ id: i, name: `${prefix}${i.toString().padStart(2, '0')}` });
        }
        return allDays;
    }

    static getHours(hourIds?: number[]): { id: number, name: string }[] {
        const allHours: { id: number, name: string }[] = [];
        for (let i = 0; i <= 23; i++) {
            allHours.push({ id: i, name: `Hour ${i.toString().padStart(2, '0')}` });
        }

        if (hourIds) {
            return allHours.filter(hour => hourIds.includes(hour["id"]));
        }
        return allHours;
    }

    static getUTCHour(hour: number) {
        // Create a Date object for today.
        const now = new Date();

        // Set the hour to the specified hour.
        now.setHours(hour, 0, 0, 0); // Sets hours, minutes, seconds, milliseconds

        // Get the UTC hour.
        const utcHour = now.getUTCHours();

        return utcHour;
    }


    /**
     * 
     * @param year 
     * @param monthIndex Month is 0-indexed (0 for January, 11 for December)
     * @returns 
     */
    static getLastDayOfMonth(year: number, monthIndex: number): number {
        return new Date(year, monthIndex, 0).getDate();
    }

    //takes a one-based month based
    static getDateInSQLFormat(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
        return `${year.toString()}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)} ${StringUtils.addLeadingZero(hour)}:${StringUtils.addLeadingZero(minute)}:${StringUtils.addLeadingZero(second)}`
    }

    static getDateInSQLFormatFromDate(date: Date): string {
        const pad = (num: number): string => num.toString().padStart(2, '0');

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1); // getMonth() is zero-based
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

    }


    static getDayFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(8, 10));
    }

    static getHourFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(11, 13));
    }

    //monthId is 1 index based
    static getMonthName(monthId: number): string {
        const monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        if (monthId >= 1 && monthId <= 12) {
            return monthNames[monthId - 1];
        } else {
            return 'Invalid Month';
        }
    }



}



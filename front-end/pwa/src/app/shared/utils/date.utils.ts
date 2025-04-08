import { StringUtils } from "./string.utils";

export class DateUtils {

    /**
     * 
     * @param year 
     * @param month Month is 0-indexed (0 for January, 11 for December)
     * @param prefix 
     * @returns 
     */
    static getDaysInMonthList(year: number, monthIndex: number): { id: number, name: string }[] {
        const allDays: { id: number, name: string }[] = [];
        const lastDay: number = DateUtils.getLastDayOfMonth(year, monthIndex);

        for (let i = 1; i <= lastDay; i++) {
            allDays.push({ id: i, name: `${i.toString().padStart(2, '0')}` });
        }
        return allDays;
    }

    /**
  * 
  * @param year 
  * @param monthIndex Month is 0-indexed (0 for January, 11 for December)
  * @returns 
  */
    static getLastDayOfMonth(year: number, monthIndex: number): number {
        // The zero day will make the date object to automatically roll back to the last day of the previous month 
        return new Date(year, monthIndex + 1, 0).getDate();
    }

    static getHours(hourIds?: number[]): { id: number, name: string }[] {
        const allHours: { id: number, name: string }[] = [];
        for (let i = 0; i <= 23; i++) {
            allHours.push({ id: i, name: `${i.toString().padStart(2, '0')}` });
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


    //takes a one-based month based
    public static getDateInSQLFormat(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
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

      public static getDayFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(8, 10));
    }

    public static getHourFromSQLDate(sqlDate: string): number {
        return Number(sqlDate.substring(11, 13));
    }

    //monthId is 1 index based
    public static getMonthName(monthId: number): string {
        const monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        if (monthId >= 1 && monthId <= 12) {
            return monthNames[monthId - 1];
        } else {
            return 'Invalid Month';
        }
    }

    public static getPresentableDatetime(strDateTimeInJavaScriptIso: string, utcOffset: number): string {
        if (utcOffset === 0) {
          return strDateTimeInJavaScriptIso.replace('T', ' ').replace('Z', '');
        }
    
        // Will subtract the offset to get UTC time if local time is ahead of UTC and add the offset to get UTC time if local time is behind UTC
        // Note, it's addition and NOT subtraction because this is meant to display the datetime NOT submiting it
        const dateAdjusted = new Date(strDateTimeInJavaScriptIso);
        dateAdjusted.setHours(dateAdjusted.getHours() + utcOffset);
    
        return dateAdjusted.toISOString().replace('T', ' ').replace('Z', '');
      }

      public static getDatetimesBasedOnUTCOffset(strDate: string, utcOffset: number, operation: 'subtract' | 'add'): string {
        if (utcOffset === 0) return strDate;
        let newDate: Date = new Date(strDate);
        if (operation === 'subtract') {
            newDate.setHours(newDate.getHours() - utcOffset);
        } else {
            newDate.setHours(newDate.getHours() + utcOffset);
        }
        return newDate.toISOString();
    }


}



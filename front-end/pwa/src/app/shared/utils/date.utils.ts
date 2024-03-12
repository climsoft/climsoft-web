import { StringUtils } from "./string.utils";

export class DateUtils {

    /**
     * 
     * @param year 
     * @param month Month is 1-indexed (1 for January, 2 for February, etc.)
     * @param prefix 
     * @returns 
     */
    static getDaysInMonthList(year: number, month: number, prefix?: string): { [key: string]: any }[] {
        const allDays: { [key: string]: any }[] = [];
        const lastDay: number = new Date(year, month, 0).getDate();

        if (prefix === undefined) {
            prefix = "Day "
        }

        for (let i = 1; i <= lastDay; i++) {
            allDays.push({ id: i, name: `${prefix}${i.toString().padStart(2, '0')}` });
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
     * @param month Month is 1-indexed (1 for January, 2 for February, etc.)
     * @returns 
     */
    static getLastDayOfMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
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



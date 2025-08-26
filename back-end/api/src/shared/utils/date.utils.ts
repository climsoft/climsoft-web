export class DateUtils {

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


    public static isMoreThanTenCalendarYears(fromDate: Date, toDate: Date): boolean {
        const tenYearsLater = new Date(fromDate);
        tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 11);
        return toDate > tenYearsLater;
    }

}



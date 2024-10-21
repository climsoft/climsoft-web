export class NumberUtils {
    public static roundOff(value: number, decimalPlaces: 1 | 2 | 3 | 4): number {
        let multiplier: number;
        switch (decimalPlaces) {
            case 4:
                multiplier = 10000;
                break;
            case 3:
                multiplier = 1000;
                break;
            case 2:
                multiplier = 100;
                break;
            case 1:
                multiplier = 10;
                break;
        }

        // JavaScript numeric operations can result to values that have floating precision issues, so use the EPSILON to adjust accordingly
        return Math.round((value + Number.EPSILON) * multiplier) / multiplier
    }

    public static getRowNumber(page: number, pageSize: number, indexOnPage: number): number {
        const startingRow = (page - 1) * pageSize;
        return startingRow + indexOnPage + 1;
      }
      

}
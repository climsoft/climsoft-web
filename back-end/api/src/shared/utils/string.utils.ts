export class StringUtils {


    public static isNullOrEmpty(input: string | null, trimWhiteSpace?: boolean) {
        if (input === null) {
            return true;
        }
        if (trimWhiteSpace) {
            input = input.trim();
        }
        return input.length === 0;
    }


    public static containsNumbersOnly(input: string): boolean {
        // Regular expression to match numeric, decimal, negative, or positive numbers
        const regex = /^[-+]?\d+(\.\d+)?$/;
        // Test the input against the pattern
        return regex.test(input);
    }

    public static containsStringBetweenNumbers(input: string): boolean {
        // Define a regular expression pattern to match digits followed by a letter, followed by digits
        const pattern = /\d+[A-Za-z]+\d+/;
        // Use the test method of the regular expression to check if the input matches the pattern
        return pattern.test(input);
    }

    public static containsNumbersAndTrailingNonNumericCharactersOnly(input: string): boolean {
        // Regular expression to match valid numbers with optional decimal part and optional trailing non-numeric characters
        const regex = /^[-+]?(\d+(\.\d*)?|\.\d+)([a-zA-Z]*)?$/;

        // Use the test method of the regular expression to check if the input matches the pattern
        return regex.test(input);
    }

    public static splitNumbersAndTrailingNonNumericCharactersOnly(input: string): [number | null, string | null] {
        const extractedNumberString: [number | null, string | null] = [null, null];

        // Regular expression to match numbers with optional decimal points
        const numberPatternRegExp: RegExp = /[+-]?\d+(\.\d+)?/;
        const matches: RegExpMatchArray | null = input.match(numberPatternRegExp);

        extractedNumberString[0] = matches ? Number(matches[0]) : null;
        extractedNumberString[1] = input.replace(numberPatternRegExp, "");
        if (StringUtils.isNullOrEmpty(extractedNumberString[1], true)) {
            extractedNumberString[1] = null;
        }
        return extractedNumberString;
    }

    public static addLeadingZero(num: number): string {
        // Check if the number is a single digit (between 0 and 9)
        // If the number is not a single digit, convert it to a string without adding a leading '0'
        return num >= 0 && num <= 9 ? `0${num}` : num.toString();
    }

    public static mapCommaSeparatedStringToNumberArray(value: string): number[]  {
        return value.split(',').map(str => parseInt(str, 10)) ;
    }

    public static mapCommaSeparatedStringToStringArray(value: string): string[]  {
        return value.split(',').map(str => str) ;
    }

    public static capitalizeFirstLetter(str: string): string {
        return str? str[0].toUpperCase() + str.slice(1) : "";
    }

}
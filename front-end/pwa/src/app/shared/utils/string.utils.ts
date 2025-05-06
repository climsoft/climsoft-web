import { HttpParams } from "@angular/common/http";

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

  public static doesNotContainNumericCharacters(inputString: string): boolean {
    // Use a regular expression to check if the string contains only non-numeric characters
    const regex = /^[^0-9]*$/;

    // Test the input string against the regular expression
    return regex.test(inputString);
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
    return num.toString().padStart(2, '0');
  }

  public static capitalizeFirstLetter(str: string): string {
    return str ? str[0].toUpperCase() + str.slice(1) : "";
  }

  public static formatEnumForDisplay(option: string | null): string {
    if (!option) {
      return '';
    }

    let wordToDisplay: string;
    const splitWords: string[] = option.split('_');
    if (splitWords.length > 1) {
      wordToDisplay = splitWords.map(word => // Capitalise the first letter of each word
        (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      ).join(' ');
    } else {
      wordToDisplay = StringUtils.capitalizeFirstLetter(option);
    }
    return wordToDisplay;
  }

  public static getQueryParams<T extends object>(queryObject: T): HttpParams {
    let httpParams: HttpParams = new HttpParams();

    // Dynamically add parameters if they are present
    Object.keys(queryObject).forEach(key => {
      const value = queryObject[key as keyof T];

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Join array values with comma for query parameters
          httpParams = httpParams.set(key, value.join(','));
        } else if (typeof value === 'object') {
          // For objects just stringify. 
          // Important note, this should technically never be used, developers should consider using POST for this kind of queries
          httpParams = httpParams.set('last', JSON.stringify(value));
        } else { 
            // Convert all other types of values to string 
            httpParams = httpParams.set(key, value.toString());  
        }
      }
    });

    return httpParams;
  }
}
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

  public static addLeadingZero(num: number): string {
    // Check if the number is a single digit (between 0 and 9)
    // If the number is not a single digit, convert it to a string without adding a leading '0'
    return num.toString().padStart(2, '0');
  }

  public static capitalizeFirstLetter(str: string): string {
    return str ? str[0].toUpperCase() + str.slice(1) : '';
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
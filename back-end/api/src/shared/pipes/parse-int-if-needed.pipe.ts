import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';

@Injectable()
export class ParseIntIfNeededPipe<T extends string | number>  implements PipeTransform<string> {
 
    constructor(private valueType : new () => T ) {
    }

    transform(value: string, metadata: ArgumentMetadata):  string| Promise<number> {

        console.log('valueType', this.valueType);

        if ( typeof this.valueType === 'number') {
            // Use the built-in ParseIntPipe to handle parsing and validation.
            return new ParseIntPipe().transform(value, metadata);
        }
        return value;  // Return as string if number is not expected.
    }
}

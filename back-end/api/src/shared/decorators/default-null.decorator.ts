import { applyDecorators } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';

/**
 * Combines @Expose() and @Transform() to ensure that missing or undefined
 * properties are normalised to `null`. Intended for FormData-based DTOs
 * where absent fields are not included in the payload.
 *
 * @Expose() forces the property into the class-transformer pipeline even
 * when it is absent from the source object, and @Transform() then converts
 * `undefined` to `null` so downstream code only deals with `T | null`.
 */
export function DefaultNull() {
    return applyDecorators(
        Expose(),
        Transform(({ value }) => value ?? null),
    );
}

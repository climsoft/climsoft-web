import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { CronExpressionParser } from 'cron-parser';

/**
 * Custom validator decorator that validates cron expressions.
 * Uses cron-parser (same library used by @nestjs/schedule) for validation.
 *
 * Supports standard 5-field cron expressions:
 * - minute (0-59)
 * - hour (0-23)
 * - day of month (1-31)
 * - month (1-12 or names)
 * - day of week (0-7 or names, where 0 and 7 are Sunday)
 *
 * Also supports optional 6-field expressions with seconds:
 * - second (0-59) - optional first field
 *
 * Valid expression examples:
 * - Every 5 minutes: "STAR/5 STAR STAR STAR STAR" (replace STAR with asterisk)
 * - Daily at 2 AM: "0 2 STAR STAR STAR"
 * - First day of every month at midnight: "0 0 1 STAR STAR"
 * - Weekdays at 9 AM: "0 9 STAR STAR 1-5"
 *
 * @param validationOptions - Optional validation options from class-validator
 */
export function IsCron(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isCron',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string' || !value.trim()) {
                        return false;
                    }

                    try {
                        CronExpressionParser.parse(value);
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid cron expression (e.g., "*/5 * * * *" for every 5 minutes, "0 9 * * *" for daily at 9 AM)`;
                },
            },
        });
    };
}

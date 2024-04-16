import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export type ExtraSelectorControlType = 'ELEMENT' | 'DAY' | 'HOUR';
export type LayoutType = 'LINEAR' | 'GRID';

export class CreateEntryFormDTO {

    //defines the extra entry selectors used by the form to get data
    // TODO. Do validations
    selectors: [ExtraSelectorControlType, ExtraSelectorControlType?];

    //defines the entry fields used by the form to display and enter data
    // TODO. Do validations
    fields: [ExtraSelectorControlType, ExtraSelectorControlType?];

    //layout used by entry fields
    // TODO. Do validations
    layout: LayoutType;

    //elements ids allowed to be recorded by the form
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    //hours allowed to be recorded by the form
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    hours: number[];

    // period for observation    
    @IsInt()
    period: number;

    // whether entry date time should be converted to UTC. 
    // Some forms don't require this because the date time on the physical form is alreday in UTC.
    @IsBoolean()
    convertDateTimeToUTC: boolean;

    @IsBoolean()
    allowDataEntryOnLimitCheckInvalid: boolean;

    //whether user should type in observation total
    @IsBoolean()
    validateTotal: boolean;

    //sample paper
    @IsString()
    samplePaperImage: string;

}
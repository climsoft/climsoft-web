import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { ImportSourceTabularParamsDto } from "./import-source-tabular-params.dto";
import { Type } from "class-transformer";

export enum DataStructureTypeEnum {
    TABULAR = 'tabular',
    KEY_VALUE = 'key_value',
}

export class ImportSourceDto {
    @IsEnum(DataStructureTypeEnum, { message: 'Data structure type must be valid' })
    dataStructureType: DataStructureTypeEnum;

    @IsOptional()
    @ValidateNested()
    @Type(() => ImportSourceTabularParamsDto) // In future this should support others like key value which is used for http oriented data exchanges
    dataStructureParameters: ImportSourceTabularParamsDto;

    /**
     * Source values that represent missing.
     * Applicable only when import of missing values is allowed.
     * Multiple missing values should be separated by commas. This means commas are not supported.
     */
    @IsString()
    sourceMissingValueIndicators: string;
}


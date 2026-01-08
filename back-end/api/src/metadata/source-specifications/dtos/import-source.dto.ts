import { IsEnum, IsOptional, IsString } from "class-validator";
import { ImportSourceTabularParamsDto } from "./import-source-tabular-params.dto";

export enum DataStructureTypeEnum {
    TABULAR = "tabular",
    KEY_VALUE = "key_value",
    BUFR = "bufr",
}

export class ImportSourceDto  {
    @IsEnum(DataStructureTypeEnum, { message: 'Data structure type must be valid' })
    dataStructureType: DataStructureTypeEnum;

    @IsOptional() // TODO. Validate nested
    dataStructureParameters: ImportSourceTabularParamsDto;

    /**
     * Source values that represent missing.
     * Applicable only when import of missing values is allowed.
     * Multiple missing values should be separated by commas. This means commas are not supported.
     */
    @IsString()
    sourceMissingValueFlags: string;
}


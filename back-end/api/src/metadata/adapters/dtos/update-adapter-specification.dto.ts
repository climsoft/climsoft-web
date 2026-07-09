import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';

/**
 * DTO for updating an existing adapter specification.
 *
 * `language` is intentionally absent — it is immutable after creation.
 * `entryPoint` is intentionally absent — enforced by language convention.
 *
 * `scriptDirName` is optional — only sent when the user uploaded a new
 * zip via `POST /adapters/upload-preview` and wants to update the version.
 * If absent, the existing script directory is unchanged.
 */
export class UpdateAdapterSpecificationDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsEnum(AdapterLanguageEnum, { message: 'Language must be one of python, r, javascript, sql' })
    language!: AdapterLanguageEnum;

    /**
     * new UUID from `POST /adapters/upload-preview`, or what was saved on the database to keep
     */
    @IsString()
    @IsNotEmpty()
    scriptDirName!: string;

    @IsBoolean()
    disabled!: boolean;

    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    comment!: string | null;
}

import { IsBoolean, IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';

/**
 * DTO for creating a new adapter specification. The zip file has already
 * been uploaded and extracted via `POST /adapters/upload-preview`, which
 * returned the `scriptDirName` (UUID) the client sends here.
 *
 * The entry point is NOT sent by the client — it is a language-level
 * convention (see `LANGUAGE_CONVENTIONS`) that the API enforces at
 * upload-preview time.
 */
export class CreateAdapterSpecificationDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsEnum(AdapterLanguageEnum, { message: 'Language must be one of python, r, javascript, sql' })
    language!: AdapterLanguageEnum;

    /**
     * The UUID directory name returned by `POST /adapters/upload-preview`.
     * The zip contents are already on disk at `<language>/scripts/<scriptDirName>/`.
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

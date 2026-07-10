import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';

/**
 * DTO for `POST /adapters/test-run-preview`. Runs a test against an
 * unsaved adapter using fields from the upload-preview step.
 * The sample file is the `file` part of the multipart request.
 *
 * The entry point is not sent — it is derived from `language` via the
 * canonical entry-point convention.
 */
export class AdapterTestRunPreviewDto {
    @IsEnum(AdapterLanguageEnum, { message: 'Language must be one of python, r, javascript, sql' })
    language!: AdapterLanguageEnum;

    @IsString()
    @IsNotEmpty()
    scriptDirName!: string;
}

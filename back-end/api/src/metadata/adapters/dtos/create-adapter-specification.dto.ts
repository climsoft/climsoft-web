import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';
import { DefaultNull } from 'src/shared/decorators/default-null.decorator';

/**
 * DTO for creating a new adapter specification. The zip file has already
 * been uploaded and extracted via `POST /adapters/upload-preview`, which
 * returned the `scriptDirName` (UUID) the client sends here.
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

    /**
     * Path inside the unzipped script tree to the entry-point file, e.g.
     * `main.py`. Validated by the service to actually exist inside the
     * already-extracted directory.
     */
    @IsString()
    @IsNotEmpty()
    entryPoint!: string;

    @IsBoolean()
    disabled!: boolean;

    @DefaultNull()
    @IsString()
    @IsNotEmpty()
    comment!: string | null;
}

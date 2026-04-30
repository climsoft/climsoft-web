import { IsBoolean, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { DefaultNull } from 'src/shared/decorators/default-null.decorator';

/**
 * DTO for updating an existing adapter specification.
 *
 * `language` is intentionally absent — it is immutable after creation.
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

    /**
     * new UUID from `POST /adapters/upload-preview`, or what was saved on the database to keep
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
    @MaxLength(255)
    entryPoint!: string;

    @IsBoolean()
    disabled!: boolean;

    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    comment!: string | null;
}

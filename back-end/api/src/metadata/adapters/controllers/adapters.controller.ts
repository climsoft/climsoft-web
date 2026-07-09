import { BadRequestException, Body, Controller, Delete, FileTypeValidator, Get, HttpCode, MaxFileSizeValidator, NotFoundException, Param, ParseFilePipe, ParseIntPipe, Patch, Post, Req, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { AppConfig } from 'src/app.config';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';
import { AdaptersService } from '../services/adapters.service';
import { CreateAdapterSpecificationDto } from '../dtos/create-adapter-specification.dto';
import { UpdateAdapterSpecificationDto } from '../dtos/update-adapter-specification.dto';
import { AdapterTestRunPreviewDto } from '../dtos/adapter-test-run-preview.dto';
import { ZipUtils } from 'src/shared/utils/zip.utils';
import { StreamableFileUtils } from 'src/shared/utils/streamable-file.utils';

/**
 * Adapter endpoints follow an upload-then-save pattern (same as import specs):
 *
 *   1. `POST /adapters/upload-preview` — uploads + extracts the zip, returns
 *      the file tree and manifest validation. The files are persisted to disk
 *      immediately; orphaned directories are cleaned up by CleanupSchedulerService.
 *   2. `POST /adapters` or `PATCH /adapters/:id` — references the already-
 *      extracted directory by its UUID (`scriptDirName`) from step 1. No zip
 *      in the request body.
 */
@Controller('adapters')
export class AdaptersController {
    constructor(private readonly adaptersService: AdaptersService) { }

    @Get()
    public findAll() {
        return this.adaptersService.findAll();
    }

    @Get('templates/:language')
    public downloadTemplate(
        @Param('language') language: string,
    ): StreamableFile {
        if (!Object.values(AdapterLanguageEnum).includes(language as AdapterLanguageEnum)) {
            throw new NotFoundException(`No template available for language '${language}'`);
        }

        const templateDir = path.resolve(__dirname, '..', 'templates', language);

        if (!fs.existsSync(templateDir)) {
            throw new NotFoundException(`Template directory not found for '${language}'`);
        }

        const buffer = ZipUtils.buildZipBufferFromDir(templateDir);
        return StreamableFileUtils.asAttachment(buffer, `adapter-template-${language}.zip`);
    }

    /**
     * Downloads a saved adapter's script directory as a zip so a sysadmin
     * can edit locally and re-upload via `upload-preview`. Excludes the
     * runner-managed `.installed/` cache.
     */
    @Admin()
    @Get(':id/download')
    public async downloadScripts(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<StreamableFile> {
        const { buffer, filename } = await this.adaptersService.buildDownloadZip(id);
        return StreamableFileUtils.asAttachment(buffer, filename);
    }

    /**
     * Downloads the full test-run output directory (including log files) as
     * a zip. Called by the dialog's test-run pane after a successful run.
     * The operation directory lives on disk until the file-cleanup scheduler
     * sweeps it — a 404 here means it has already been aged out.
     */
    @Admin()
    @Get('test-run-preview/output/:operationId')
    public async downloadTestRunOutput(
        @Param('operationId') operationId: string,
    ): Promise<StreamableFile> {
        const { buffer, filename } = await this.adaptersService.getTestRunOutputZip(operationId);
        return StreamableFileUtils.asAttachment(buffer, filename);
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.adaptersService.find(id);
    }

    /**
     * Returns the file tree and manifest validation for an existing adapter's
     * script directory. Called when the dialog opens in edit mode so the
     * sysadmin sees the same verified preview as for a fresh upload.
     */
    @Get(':id/file-tree')
    public getFileTree(@Param('id', ParseIntPipe) id: number) {
        return this.adaptersService.getFileTree(id);
    }

    /**
     * Uploads and extracts a zip file, returning the file tree and manifest
     * validation status. The extracted directory is persisted to disk
     * immediately — the returned `scriptDirName` is sent back in the
     * subsequent create or update request.
     */
    @Admin()
    @Post('upload-preview')
    @UseInterceptors(FileInterceptor('file'))
    public async uploadPreview(
        @Body('language') language: AdapterLanguageEnum,
        @UploadedFile(new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({ maxSize: AppConfig.adapters.maxUploadSizeBytes }),
                new FileTypeValidator({
                    fileType: /(application\/zip|application\/x-zip-compressed|application\/octet-stream)/,
                    fallbackToMimetype: true,
                }),
            ],
        })) file: Express.Multer.File,
    ) {
        if (!Object.values(AdapterLanguageEnum).includes(language)) {
            throw new BadRequestException(`Invalid language: ${language}`);
        }
        return this.adaptersService.uploadPreview(file, language);
    }

    /**
     * Creates a new adapter specification. The zip has already been uploaded
     * via `POST /adapters/upload-preview` — the body contains `scriptDirName`
     * (UUID) referencing the already-extracted directory on disk.
     */
    @Admin()
    @Post()
    public async create(
        @Req() request: Request,
        @Body() dto: CreateAdapterSpecificationDto,
    ) {
        return this.adaptersService.create(dto, AuthUtil.getLoggedInUserId(request));
    }

    /**
     * Updates an existing adapter specification. If `dto.scriptDirName` is
     * set, it references a new directory from a recent `upload-preview` call.
     * If omitted, the existing script directory is unchanged.
     */
    @Admin()
    @Patch(':id')
    public async update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAdapterSpecificationDto,
    ) {
        return this.adaptersService.update(id, dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete()
    @HttpCode(204)
    async deleteAll() {
        return this.adaptersService.deleteAll();
    }

    @Admin()
    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseIntPipe) id: number) {
        await this.adaptersService.delete(id);
    }

    /**
     * Runs a test against an unsaved adapter. Uses the `scriptDirName` from
     * a prior `upload-preview` call + language + entry point from the DTO,
     * plus a sample file. Lets sysadmins verify their script before saving.
     */
    @Admin()
    @Post('test-run-preview')
    @UseInterceptors(FileInterceptor('file'))
    public async testRunPreview(
        @Req() request: Request,
        @Body() dto: AdapterTestRunPreviewDto,
        @UploadedFile() file: Express.Multer.File | undefined,
    ) {
        if (!file) {
            throw new BadRequestException('A sample input file is required for a test run');
        }
        return this.adaptersService.testRunPreview(dto, file, AuthUtil.getLoggedInUserId(request));
    }

   }

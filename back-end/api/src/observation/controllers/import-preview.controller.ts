import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ImportPreviewService } from '../services/import-preview.service';
import { BaseParamsDto, PreviewForStepDto, PreviewForImportDto, PreviewForSourceDto } from '../dtos/import-preview.dto';
import { AuthUtil } from 'src/user/services/auth.util';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';

@Controller('import-preview')
export class ImportPreviewController {

    constructor(
        private importPreviewService: ImportPreviewService,
        private sourcesService: SourceSpecificationsService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    public async upload(
        @UploadedFile(new ParseFilePipe({
            validators: [
                // 5GB to accomodate preview of large files. Note, should always be same us that used in `observationsController` for upload endpoint to ensure smooth preview of files uploaded for import.
                // In future, this should come from environment.
                new MaxFileSizeValidator({ maxSize: (1024 * 1024 * 1024) * 5 }),
                new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
            ]
        })) file: Express.Multer.File,
        @Body() dto: BaseParamsDto,
    ) {
        return this.importPreviewService.initAndPreviewRawData(file, dto);
    }

    @Post('init-from-file/:fileName')
    public async initFromFile(
        @Param('fileName') fileName: string,
        @Body() dto: BaseParamsDto,
    ) {
        return this.importPreviewService.initAndPreviewRawData(fileName, dto);
    }

    @Post('base-params/:sessionId')
    public async updateBaseParams(
        @Param('sessionId') sessionId: string,
        @Body() dto: BaseParamsDto,
    ) {
        return this.importPreviewService.updateBaseParamsAndPreviewRawData(sessionId, dto);
    }

    @Post('process-for-sample-import/:sessionId')
    public async previewStep(
        @Param('sessionId') sessionId: string,
        @Body() dto: PreviewForStepDto,
    ) {
        return this.importPreviewService.previewTransformedData(sessionId, { ...dto.sourceDefinition, id: 0, sampleFileName: '' }, dto.stationId ?? null);
    }

    @Post('process-for-import/:sessionId')
    public async previewForImport(
        @Param('sessionId') sessionId: string,
        @Body() dto: PreviewForImportDto, // TODO. Validate that the user has import rights for the source and station
    ) {
        return this.importPreviewService.previewTransformedData(sessionId, this.sourcesService.find(dto.sourceId), dto.stationId ?? null);
    }

    /**
     * Source-scoped view-only preview of the spec's stored sample file.
     * Returns raw + transformed previews with the session already torn
     * down (so `raw.sessionId` is empty). Returns `null` when the spec
     * has no sample file on record.
     */
    @Post('sample-for-source/:sourceId')
    public async previewSampleForSource(
        @Param('sourceId', ParseIntPipe) sourceId: number,
    ) {
        return this.importPreviewService.previewSampleForSource(sourceId);
    }

    /**
     * Source-scoped upload used by the import-entry dialog. The saved
     * spec's base params (adapter, rowsToSkip, delimiter) are applied
     * server-side, and both the raw and transformed previews are returned
     * in a single round trip.
     */
    @Post('upload-for-source/:sourceId')
    @UseInterceptors(FileInterceptor('file'))
    public async uploadForSource(
        @Param('sourceId', ParseIntPipe) sourceId: number,
        @UploadedFile(new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({ maxSize: (1024 * 1024 * 1024) * 5 }), // 5GB to accomodate preview of large files. Note, should always be same us that used in `ImportPreviewController` for upload endpoint to ensure smooth preview of files uploaded for import.
                new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
            ]
        })) file: Express.Multer.File,
        @Body() dto: PreviewForSourceDto, // TODO. Validate that the user has import rights for the source and station
    ) {
        return this.importPreviewService.previewForSource(file, sourceId, dto.stationId ?? null);
    }


    @Post('import-for-source/:sessionId')
    public async confirmImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: PreviewForImportDto, // TODO. Validate that the user has import rights for the source and station
    ) {
        await this.importPreviewService.importData(sessionId, dto, AuthUtil.getLoggedInUserId(request));
        return this.importPreviewService.destroySession(sessionId);
    }

    @Delete(':sessionId')
    public async deleteSession(
        @Param('sessionId') sessionId: string,
    ) {
        return this.importPreviewService.destroySession(sessionId);
    }

}

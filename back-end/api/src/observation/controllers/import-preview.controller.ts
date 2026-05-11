import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ImportPreviewService } from '../services/import-preview.service';
import { BaseParamsDto, ProcessPreviewDto as PreviewForStepDto, PreviewForImportDto } from '../dtos/import-preview.dto';
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
                // 1GB to accomodate preview of large files. Note, should always be same us that used in `observationsController` for upload endpoint to ensure smooth preview of files uploaded for import.
                // In future, this should come from environment.
                new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }),
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

    @Post('confirm-import/:sessionId')
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

import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ImportPreviewService } from '../services/import-preview.service';
import { UpdateBaseParamsDto, ProcessPreviewDto, InitFromFileDto, PreviewForImportDto } from '../dtos/import-preview.dto';
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
                new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }),
                new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
            ]
        })) file: Express.Multer.File,
        @Body('rowsToSkip', ParseIntPipe) rowsToSkip: number,
        @Body('delimiter') delimiter?: string,
    ) {
        const skip: number = rowsToSkip > 0 ? rowsToSkip : 0;
        const delim: string | undefined = delimiter || undefined;
        return this.importPreviewService.initAndPreviewRawFile(file, skip, delim);
    }

    @Post('init-from-file')
    public async initFromFile(
        @Body() dto: InitFromFileDto,
    ) {
        return this.importPreviewService.initAndPreviewRawFile(dto.fileName, dto.rowsToSkip, dto.delimiter);
    }

    @Post('base-params/:sessionId')
    public async updateBaseParams(
        @Param('sessionId') sessionId: string,
        @Body() dto: UpdateBaseParamsDto,
    ) {
        return this.importPreviewService.updateBaseParamsAndPreviewRawFile(sessionId, dto.rowsToSkip, dto.delimiter);
    }

    @Post('process-for-sample-import/:sessionId')
    public async processPreview(
        @Param('sessionId') sessionId: string,
        @Body() dto: ProcessPreviewDto,
    ) {
        return this.importPreviewService.transformAndPreviewFile(sessionId, dto.sourceDefinition, dto.stationId);
    }

    @Post('process-for-import/:sessionId')
    public async previewForImport(
        @Param('sessionId') sessionId: string,
        @Body() dto: PreviewForImportDto, // TODO. Validate that the user has import rights for the source and station
    ) {
        return this.importPreviewService.transformAndPreviewFile(sessionId, this.sourcesService.find(dto.sourceId), dto.stationId);
    }

    @Post('confirm-import/:sessionId')
    public async confirmImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: PreviewForImportDto, // TODO. Validate that the user has import rights for the source and station
    ) {
        await this.importPreviewService.importFile(sessionId, dto, AuthUtil.getLoggedInUserId(request));
        return this.importPreviewService.destroySession(sessionId);
    }

    @Delete(':sessionId')
    public async deleteSession(
        @Param('sessionId') sessionId: string,
    ) {
        return this.importPreviewService.destroySession(sessionId);
    }

}

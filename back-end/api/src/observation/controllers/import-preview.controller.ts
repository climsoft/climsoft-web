import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportPreviewService } from '../services/import-preview.service';
import { UpdateBaseParamsDto, ProcessPreviewDto } from '../dtos/import-preview.dto';

@Controller('import-preview')
export class ImportPreviewController {

    constructor(
        private importPreviewService: ImportPreviewService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    public async upload(
        @UploadedFile(new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 }), // 50MB for sample files
                new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
            ]
        })) file: Express.Multer.File,
        @Body('rowsToSkip', ParseIntPipe) rowsToSkip: number,
        @Body('delimiter') delimiter?: string,
    ) {
        const skip: number = rowsToSkip > 0 ? rowsToSkip : 0;
        const delim: string | undefined = delimiter || undefined;
        return await this.importPreviewService.uploadAndPreview(file, skip, delim);
    }

    @Post('base-params/:sessionId')
    public async updateBaseParams(
        @Param('sessionId') sessionId: string,
        @Body() dto: UpdateBaseParamsDto,
    ) {
        return await this.importPreviewService.updateBaseParams(sessionId, dto.rowsToSkip, dto.delimiter);
    }

    @Post('process/:sessionId')
    public async processPreview(
        @Param('sessionId') sessionId: string,
        @Body() dto: ProcessPreviewDto,
    ) {
        return await this.importPreviewService.previewStep(sessionId, dto.sourceDefinition, dto.stationId);
    }

    @Delete(':sessionId')
    public async deleteSession(
        @Param('sessionId') sessionId: string,
    ) {
        await this.importPreviewService.destroySession(sessionId);
        return { message: 'Session cleaned up' };
    }

}

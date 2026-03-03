import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { MetadataImportPreviewService } from '../services/metadata-import-preview.service';
import { UpdateBaseParamsDto, StationTransformDto, ElementTransformDto } from '../dtos/metadata-import-preview.dto';
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator';

@Admin()
@Controller('metadata-import-preview')
export class MetadataImportPreviewController {

    constructor(
        private metadataImportPreviewService: MetadataImportPreviewService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    public async upload(
        @UploadedFile(new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 }), // 50MB
                new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
            ]
        })) file: Express.Multer.File,
        @Body('rowsToSkip', ParseIntPipe) rowsToSkip: number,
        @Body('delimiter') delimiter?: string,
    ) {
        const skip: number = rowsToSkip > 0 ? rowsToSkip : 0;
        const delim: string | undefined = delimiter || undefined;
        return this.metadataImportPreviewService.initAndPreviewRawFile(file, skip, delim);
    }

    @Post('base-params/:sessionId')
    public async updateBaseParams(
        @Param('sessionId') sessionId: string,
        @Body() dto: UpdateBaseParamsDto,
    ) {
        return this.metadataImportPreviewService.updateBaseParamsAndPreviewRawFile(sessionId, dto.rowsToSkip, dto.delimiter);
    }

    @Post('preview-stations/:sessionId')
    public async previewStations(
        @Param('sessionId') sessionId: string,
        @Body() dto: StationTransformDto,
    ) {
        return this.metadataImportPreviewService.transformAndPreviewStations(sessionId, dto.rowsToSkip, dto.delimiter, dto.columnMapping);
    }

    @Post('confirm-station-import/:sessionId')
    public async confirmStationImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: StationTransformDto,
    ) {
        await this.metadataImportPreviewService.confirmStationImport(sessionId, dto.rowsToSkip, dto.delimiter, dto.columnMapping, AuthUtil.getLoggedInUserId(request));
        await this.metadataImportPreviewService.destroySession(sessionId);
        return { message: 'Station import completed successfully' };
    }

    @Post('preview-elements/:sessionId')
    public async previewElements(
        @Param('sessionId') sessionId: string,
        @Body() dto: ElementTransformDto,
    ) {
        return this.metadataImportPreviewService.transformAndPreviewElements(sessionId, dto.rowsToSkip, dto.delimiter, dto.columnMapping);
    }

    @Post('confirm-element-import/:sessionId')
    public async confirmElementImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: ElementTransformDto,
    ) {
        await this.metadataImportPreviewService.confirmElementImport(sessionId, dto.rowsToSkip, dto.delimiter, dto.columnMapping, AuthUtil.getLoggedInUserId(request));
        await this.metadataImportPreviewService.destroySession(sessionId);
        return { message: 'Element import completed successfully' };
    }

    @Delete(':sessionId')
    public async deleteSession(
        @Param('sessionId') sessionId: string,
    ) {
        return this.metadataImportPreviewService.destroySession(sessionId);
    }
}

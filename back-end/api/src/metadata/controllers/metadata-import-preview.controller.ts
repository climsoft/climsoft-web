import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { MetadataImportPreviewService } from '../services/metadata-import-preview.service'; 
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator';
import { UpdateBaseParamsDto } from 'src/observation/dtos/import-preview.dto';
import { ElementColumnMappingDto, StationColumnMappingDto } from '../dtos/metadata-import-preview.dto';

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
        return this.metadataImportPreviewService.initAndPreviewRawData(file, skip, delim);
    }

    @Post('base-params/:sessionId')
    public async updateBaseParams(
        @Param('sessionId') sessionId: string,
        @Body() dto: UpdateBaseParamsDto,
    ) {
        return this.metadataImportPreviewService.updateBaseParamsAndPreviewRawData(sessionId, dto.rowsToSkip, dto.delimiter);
    }

    @Post('preview-stations/:sessionId')
    public async previewStations(
        @Param('sessionId') sessionId: string,
        @Body() dto: StationColumnMappingDto,
    ) {
        return this.metadataImportPreviewService.previewTransformedStationData(sessionId, dto);
    }

    @Post('confirm-station-import/:sessionId')
    public async confirmStationImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: StationColumnMappingDto,
    ) {
        await this.metadataImportPreviewService.importStationData(sessionId, dto, AuthUtil.getLoggedInUserId(request));
        await this.metadataImportPreviewService.destroySession(sessionId); 
    }

    @Post('preview-elements/:sessionId')
    public async previewElements(
        @Param('sessionId') sessionId: string,
        @Body() dto: ElementColumnMappingDto,
    ) {
        return this.metadataImportPreviewService.previewTransformedElementsData(sessionId, dto );
    }

    @Post('confirm-element-import/:sessionId')
    public async confirmElementImport(
        @Req() request: Request,
        @Param('sessionId') sessionId: string,
        @Body() dto: ElementColumnMappingDto,
    ) {
        await this.metadataImportPreviewService.importElementsData(sessionId, dto , AuthUtil.getLoggedInUserId(request));
        await this.metadataImportPreviewService.destroySession(sessionId); 
    }

    @Delete(':sessionId')
    public async deleteSession(
        @Param('sessionId') sessionId: string,
    ) {
        return this.metadataImportPreviewService.destroySession(sessionId);
    }
}

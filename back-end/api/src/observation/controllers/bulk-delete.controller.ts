import { Body, Controller, Delete, Get, Param, Post, Req, StreamableFile } from '@nestjs/common';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { BulkDeleteService } from '../services/bulk-delete.service';
import { BulkDeleteCheckDto, BulkDeleteExecuteDto } from '../dtos/bulk-delete.dto';

@Admin()
@Controller('observations/bulk-delete')
export class BulkDeleteController {
    constructor(private bulkDeleteService: BulkDeleteService) { }

    @Post('check')
    public async check(@Body() dto: BulkDeleteCheckDto) {
        return this.bulkDeleteService.checkForDeletion(dto);
    }

    @Get('preview-download/:sessionId')
    public async previewDownload(@Param('sessionId') sessionId: string): Promise<StreamableFile> {
        return this.bulkDeleteService.downloadPreviewCsv(sessionId);
    }

    @Post('execute')
    public async execute(@Req() request: Request, @Body() dto: BulkDeleteExecuteDto) {
        return this.bulkDeleteService.executeDeletion(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Delete(':sessionId')
    public async deleteSession(@Param('sessionId') sessionId: string) {
        return this.bulkDeleteService.destroySession(sessionId);
    }
}

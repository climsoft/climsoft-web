import { Body, Controller, Delete, Get, Param, Post, Req, StreamableFile } from '@nestjs/common';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { BulkRestoreService } from '../services/bulk-restore.service';
import { BulkRestoreCheckDto, BulkRestoreExecuteDto } from '../dtos/bulk-restore.dto';

@Admin()
@Controller('observations/bulk-restore')
export class BulkRestoreController {
    constructor(private bulkRestoreService: BulkRestoreService) { }

    @Post('check')
    public async check(@Body() dto: BulkRestoreCheckDto) {
        return this.bulkRestoreService.checkForRestore(dto);
    }

    @Get('preview-download/:sessionId')
    public async previewDownload(@Param('sessionId') sessionId: string): Promise<StreamableFile> {
        return this.bulkRestoreService.downloadPreviewCsv(sessionId);
    }

    @Post('execute')
    public async execute(@Req() request: Request, @Body() dto: BulkRestoreExecuteDto) {
        return this.bulkRestoreService.executeRestore(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Delete(':sessionId')
    public async deleteSession(@Param('sessionId') sessionId: string) {
        return this.bulkRestoreService.destroySession(sessionId);
    }
}

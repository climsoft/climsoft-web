import { Body, Controller, Delete, Get, Param, Post, StreamableFile } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { BulkPermanentDeleteService } from '../services/bulk-permanent-delete.service';
import { BulkPermanentDeleteCheckDto, BulkPermanentDeleteExecuteDto } from '../dtos/bulk-permanent-delete.dto';

@Admin()
@Controller('observations/bulk-permanent-delete')
export class BulkPermanentDeleteController {
    constructor(private bulkPermanentDeleteService: BulkPermanentDeleteService) { }

    @Post('check')
    public async check(@Body() dto: BulkPermanentDeleteCheckDto) {
        return this.bulkPermanentDeleteService.checkForDeletion(dto);
    }

    @Get('preview-download/:sessionId')
    public async previewDownload(@Param('sessionId') sessionId: string): Promise<StreamableFile> {
        return this.bulkPermanentDeleteService.downloadPreviewCsv(sessionId);
    }

    @Post('execute')
    public async execute(@Body() dto: BulkPermanentDeleteExecuteDto) {
        return this.bulkPermanentDeleteService.executeDeletion(dto);
    }

    @Delete(':sessionId')
    public async deleteSession(@Param('sessionId') sessionId: string) {
        return this.bulkPermanentDeleteService.destroySession(sessionId);
    }
}

import { Body, Controller, Delete, Get, Param, Post, Req, StreamableFile } from '@nestjs/common';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { BulkPkUpdateService } from '../services/bulk-pk-update.service';
import { BulkPkUpdateCheckDto, BulkPkUpdateExecuteDto } from '../dtos/bulk-pk-update.dto';

@Admin()
@Controller('observations/bulk-pk-update')
export class BulkPkUpdateController {
    constructor(private bulkPkUpdateService: BulkPkUpdateService) { }

    @Post('check')
    public async check(@Body() dto: BulkPkUpdateCheckDto) {
        return this.bulkPkUpdateService.checkForConflicts(dto);
    }

    @Get('conflict-download/:sessionId')
    public async conflictDownload(@Param('sessionId') sessionId: string): Promise<StreamableFile> {
        return this.bulkPkUpdateService.downloadConflictCsv(sessionId);
    }

    @Post('execute')
    public async execute(@Req() request: Request, @Body() dto: BulkPkUpdateExecuteDto) {
        return this.bulkPkUpdateService.executeUpdate(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Delete(':sessionId')
    public async deleteSession(@Param('sessionId') sessionId: string) {
        return this.bulkPkUpdateService.destroySession(sessionId);
    }
}

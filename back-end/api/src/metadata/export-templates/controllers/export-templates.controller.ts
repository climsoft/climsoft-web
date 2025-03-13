import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { ExportTemplatesService } from '../services/export-templates.service';
import { CreateExportTemplateDto } from '../dtos/create-export-template.dto';
import { AuthorisedExportsPipe } from 'src/user/pipes/authorised-exports.pipe';

@Controller('export-templates')
export class ExportTemplatesController {

    constructor(private readonly exportTemplateService: ExportTemplatesService) { }

    @Get()
    public find(
        @Query(AuthorisedExportsPipe) exportTemplateIds: number[]
    ) {
        return this.exportTemplateService.findAll(exportTemplateIds);
    }

    @Get(':id')
    public findOne(@Param('id', AuthorisedExportsPipe) id: number) {
        return this.exportTemplateService.find(id);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() dto: CreateExportTemplateDto) {
        return this.exportTemplateService.create(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateExportTemplateDto) {
        return this.exportTemplateService.update(id, dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete()
    public deleteAll() {
        return this.exportTemplateService.deleteAll();
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.exportTemplateService.delete(id);
    }


}

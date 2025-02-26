import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { ExportTemplatesService } from '../services/export-templates.service';
import { CreateExportTemplateDto } from '../dtos/create-export-template.dto';

@Controller('export-templates')
export class ExportTemplatesController {

    constructor(private readonly sourcesService: ExportTemplatesService) { }

    @Get()
    public findAll() {
        return this.sourcesService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.sourcesService.find(id);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() createSourceDto: CreateExportTemplateDto) {
        return this.sourcesService.put(createSourceDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() createSourceDto: CreateExportTemplateDto) {
        return this.sourcesService.update(id, createSourceDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete()
    public deleteAll() {
        return this.sourcesService.deleteAll();
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.sourcesService.delete(id);
    }


}

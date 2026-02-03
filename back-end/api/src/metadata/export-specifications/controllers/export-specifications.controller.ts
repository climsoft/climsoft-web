import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { ExportSpecificationsService } from '../services/export-specifications.service'; 
import { AuthorisedExportsPipe } from 'src/user/pipes/authorised-exports.pipe';
import { CreateExportSpecificationDto } from '../dtos/create-export-specification.dto';
import { BUFR_CONVERTER_SPECIFICATIONS, BufrConverterSpecification } from '../dtos/bufr-converter';

@Controller('export-specifications')
export class ExportSpecificationsController {

    constructor(private readonly exportTemplateService: ExportSpecificationsService) { }

    @Get()
    public find() {
        return this.exportTemplateService.findAll();
    }

    @Get('bufr-converter-specifications')
    public findBufrConverterSpecifications(): BufrConverterSpecification[] {
        return BUFR_CONVERTER_SPECIFICATIONS;
    }

    @Get(':id')
    public findOne(@Param('id', AuthorisedExportsPipe) id: number) {
        return this.exportTemplateService.find(id);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() dto: CreateExportSpecificationDto) {
        return this.exportTemplateService.create(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateExportSpecificationDto) {
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

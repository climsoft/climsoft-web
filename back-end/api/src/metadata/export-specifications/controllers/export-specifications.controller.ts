import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { ExportSpecificationsService } from '../services/export-specifications.service';
import { AuthorisedExportsPipe } from 'src/user/pipes/authorised-exports.pipe';
import { CreateExportSpecificationDto } from '../dtos/create-export-specification.dto';
import { CLIMAT_BUFR_ELEMENTS, DAYCLI_BUFR_ELEMENTS, SYNOP_BUFR_ELEMENTS } from '../dtos/bufr-export-parameters.dto';

@Controller('export-specifications')
export class ExportSpecificationsController {

    constructor(private readonly exportTemplateService: ExportSpecificationsService) { }

    @Get()
    public find() {
        return this.exportTemplateService.findAll();
    }

    @Get('synop-bufr-elements')
    public findSynopBufrElements(): string[] {
        return SYNOP_BUFR_ELEMENTS;
    }

    @Get('daycli-bufr-elements')
    public findDayCliBufrElements(): string[] {
        return DAYCLI_BUFR_ELEMENTS;
    }

    @Get('climat-bufr-elements')
    public findClimatBufrElements(): string[] {
        return CLIMAT_BUFR_ELEMENTS;
    }

    @Get('temp-bufr-elements')
    public findTempBufrElements(): string[] {
        return CLIMAT_BUFR_ELEMENTS;
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

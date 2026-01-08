import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { SourceSpecificationsService } from '../services/source-specifications.service';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { CreateSourceDto } from '../dtos/create-source.dto';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('source-specifications') // TODO. Change to source-specifications later
export class SourceSpecificationsController {

    constructor(private readonly sourcesService: SourceSpecificationsService) { }

    @Get()
    public findAll() {
        return this.sourcesService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.sourcesService.find(id);
    }

    @Get('source-type/:id')
    public findSourcesOfType(@Param('id') id: SourceTypeEnum) { // TODO validate enum. 
        return this.sourcesService.findSourcesByType(id);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() createSourceDto: CreateSourceDto) { // TODO. Validate the dto 
        return this.sourcesService.create(createSourceDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() createSourceDto: CreateSourceDto) { // TODO. Validate the dto
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

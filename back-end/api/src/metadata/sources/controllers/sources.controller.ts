import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { SourcesService } from '../services/sources.service';
import { SourceTypeEnum } from 'src/metadata/sources/enums/source-type.enum';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcesService: SourcesService) { }

    @Get()
    public findAll() {
        return this.sourcesService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.sourcesService.find(id);
    }

    @Get('/source-type/:id')
    public findSourcesOfType(@Param('id') id: SourceTypeEnum) { // TODO validate enum. 
        return this.sourcesService.findSourcesByType(id);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() createSourceDto: CreateUpdateSourceDto) { // TODO. Validate the dto
        return this.sourcesService.create(createSourceDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(@Param('id', ParseIntPipe) id: number, @Body() createSourceDto: CreateUpdateSourceDto) { // TODO. Validate the dto
        return this.sourcesService.update(id, createSourceDto);
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.sourcesService.delete(id);
    }


}

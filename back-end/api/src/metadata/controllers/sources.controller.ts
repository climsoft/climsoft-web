import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SourcesService } from '../services/sources.service';
import { CreateSourceDto } from '../dtos/create-source.dto'; 
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { SourceTypeEnum } from '../enums/source-type.enum';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcesService: SourcesService) { }

    @Get()
    find() {
        return this.sourcesService.findSourcesBySourceTypes();
    }
   
    @Get('/source/:id')
    findSource(@Param('id', ParseIntPipe) id: number) { 
        return this.sourcesService.findSource(id);
    }

    @Get('/source-type/:id')
    findSourcesOfType(@Param('id') id: SourceTypeEnum) {
        // TODO validate enum. 
        console.log("finding sources of type: ", id);
        return this.sourcesService.findSourcesBySourceTypes(id);
    }

    @Admin()
    @Post()
    create(@Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.create(createSourceDto);
    }

    @Admin()
    @Patch(':id')
    update(@Param('id',ParseIntPipe) id: number, @Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.updateSource(id, createSourceDto);
    }

    @Admin()
    @Delete(':id')
    delete(@Param('id',ParseIntPipe) id: number) {
        return this.sourcesService.deleteSource(id);
    }

}

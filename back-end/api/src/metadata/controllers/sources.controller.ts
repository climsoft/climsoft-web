import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SourcesService } from '../services/sources.service';
import { CreateSourceDto } from '../dtos/create-source.dto'; 
import { Admin } from 'src/user/decorators/admin.decorator';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcesService: SourcesService) { }

    // @Get()
    // find(@Query() query: { [key: string]: number }) {
    //     if (query['sourceId']) {
    //         return this.sourcesService.findSource(query['sourceId']);
    //     } else if (query['sourceTypeId']) {
    //         return this.sourcesService.findSources(query['sourceTypeId']);
    //     } else {
    //         return this.sourcesService.findSources();
    //     }     
    // }

    @Get()
    find() {
        return this.sourcesService.findSources();
    }
   
    @Get('/source/:id')
    findSource(@Param('id') id: number) {
        return this.sourcesService.findSource(id);
    }

    @Get('/source-type/:id')
    findSourcesOfType(@Param('id') id: number) {
        return this.sourcesService.findSources(id);
    }

    @Admin()
    @Post()
    create(@Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.create(createSourceDto);
    }

    @Admin()
    @Patch(':id')
    update(@Param('id') id: number, @Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.updateSource(id, createSourceDto);
    }

    @Admin()
    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.sourcesService.deleteSource(id);
    }

}

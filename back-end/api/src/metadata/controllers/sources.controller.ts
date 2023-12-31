import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SourcesService } from '../services/sources.service';
import { CreateSourceDto } from '../dtos/create-source.dto';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcesService: SourcesService) { }

    @Get()
    find(@Query() query: { [key: string]: number }) {
        if (query['sourceId']) {
            return this.sourcesService.findSource(query['sourceId']);
        } else if (query['sourceTypeId']) {
            return this.sourcesService.findSources(query['sourceTypeId']);
        } else {
            return this.sourcesService.findSources();
        }    
    }

    @Post()
    create(@Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.create(createSourceDto);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.updateSource(id, createSourceDto);
    }

    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.sourcesService.deleteSource(id);
    }

}

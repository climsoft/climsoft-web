import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcesService: SourcesService) { }

    @Get()
    find(@Query() query: { [key: string]: number }) {
        if (query['sourceId']) {
            return this.sourcesService.findOne(query['sourceId']);
        } else if (query['sourceTypeId']) {
            return this.sourcesService.find(query['sourceTypeId']);
        } else {
            return this.sourcesService.find();
        }    
    }

    @Post()
    create(@Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.create(createSourceDto);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body() createSourceDto: CreateSourceDto) {
        return this.sourcesService.update(id, createSourceDto);
    }

    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.sourcesService.delete(id);
    }

}

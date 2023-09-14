import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';

@Controller('sources')
export class SourcesController {

    constructor(private readonly sourcessService: SourcesService) { }

    @Get()
    find(@Query() query: { [key: string]: number }) {
        if (query['sourceId']) {
            return this.sourcessService.findOne(query['sourceId']);
        } else if (query['sourceTypeId']) {
            return this.sourcessService.find(query['sourceTypeId']);
        } else {
            return this.sourcessService.find();
        }    
    }

    @Post()
    create(@Body() createSourceDto: CreateSourceDto) {
        return this.sourcessService.create(createSourceDto);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body() createSourceDto: CreateSourceDto) {
        return this.sourcessService.update(id, createSourceDto);
    }

    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.sourcessService.delete(id);
    }

}

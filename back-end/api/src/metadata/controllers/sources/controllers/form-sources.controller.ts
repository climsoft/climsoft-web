import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { CreateEntryFormDTO } from 'src/metadata/controllers/sources/dtos/create-entry-form.dto';
import { FormSourcesService } from 'src/metadata/controllers/sources/services/form-sources.service';

@Controller('form-sources')
export class FormSourcesController {

    constructor(private readonly formSourcesService: FormSourcesService) { }

    @Get()
    public findAll() {
        return this.formSourcesService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.formSourcesService.find(id);
    }

    @Admin()
    @Post()
    public create(@Body() createSourceDto: CreateUpdateSourceDto<CreateEntryFormDTO>) {
        return this.formSourcesService.create(createSourceDto);
    }

    @Admin()
    @Patch(':id')
    public update(@Param('id', ParseIntPipe) id: number, @Body() createSourceDto: CreateUpdateSourceDto<CreateEntryFormDTO>) {
        return this.formSourcesService.update(id, createSourceDto);
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.formSourcesService.delete(id);
    }



}

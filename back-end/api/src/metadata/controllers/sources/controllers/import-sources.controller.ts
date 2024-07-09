import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { ImportSourcesService } from '../services/import-sources.service';
import { CreateImportSourceDTO } from '../dtos/create-import-source.dto';
import { ValidateImportSourcePipe } from '../pipes/valid-import-sources.pipe';

@Controller('import-sources')
export class ImportSourcesController {

    constructor(private readonly importSourcesService: ImportSourcesService) { }

    @Get()
    public findAll() {
        return this.importSourcesService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.importSourcesService.find(id);
    }

    @Admin()
    @Post()
    public create(@Body(ValidateImportSourcePipe) createSourceDto: CreateUpdateSourceDto<CreateImportSourceDTO>) {
        return this.importSourcesService.create(createSourceDto);
    }

    @Admin()
    @Patch(':id')
    public update(
        @Param('id', ParseIntPipe) id: number,
        @Body(ValidateImportSourcePipe) createSourceDto: CreateUpdateSourceDto<CreateImportSourceDTO>) {
        return this.importSourcesService.update(id, createSourceDto);
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.importSourcesService.delete(id);
    }



}

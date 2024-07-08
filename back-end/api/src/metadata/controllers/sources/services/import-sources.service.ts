import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceTypeEnum } from '../../../enums/source-type.enum';
import { SourceEntity } from 'src/metadata/entities/sources/source.entity';
import { FindOptionsWhere } from 'typeorm';
import { CreateEntryFormDTO } from '../dtos/create-entry-form.dto';
import { ViewSourceDto } from '../dtos/view-source.dto';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { SourcesService } from './sources.service';
import { CreateImportSourceDTO } from '../dtos/create-import-source.dto';

@Injectable()
export class ImportSourcesService {

    constructor(
        private sourcesService: SourcesService ) { }


    public async findAll(): Promise<ViewSourceDto<CreateImportSourceDTO>[]> {

        const findOptionsWhere: FindOptionsWhere<SourceEntity> = {
            sourceType: SourceTypeEnum.IMPORT
        };

        const dto: ViewSourceDto<CreateImportSourceDTO>[] = await this.sourcesService.findAll(findOptionsWhere);

        return dto;
    }

    public async find(id: number): Promise<ViewSourceDto<CreateImportSourceDTO>> {

        const dto: ViewSourceDto<CreateImportSourceDTO> = await this.sourcesService.find(id);

        if (dto.sourceType !== SourceTypeEnum.IMPORT) {
            throw new NotFoundException(`Source #${id} is not an import source`);
        }

        return dto;
    }

    public async create(sourceDto: CreateUpdateSourceDto<CreateImportSourceDTO>): Promise<ViewSourceDto<CreateImportSourceDTO>> {

        const dto: ViewSourceDto<CreateImportSourceDTO> = await this.sourcesService.create(sourceDto);

        return this.find(dto.id)
    }

    public async update(id: number, sourceDto: CreateUpdateSourceDto<CreateImportSourceDTO>) {

        await this.sourcesService.update(id, sourceDto);

        return this.find(id)
    }

    public async delete(id: number): Promise<number> {
        return this.sourcesService.delete(id);
    }

}

import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceTypeEnum } from '../../../enums/source-type.enum';
import { ViewEntryFormDTO } from 'src/metadata/controllers/sources/dtos/view-entry-form.dto';
import { ElementsService } from '../../../services/elements/elements.service';
import { ViewElementDto } from 'src/metadata/dtos/elements/view-element.dto';
import { SourceEntity } from 'src/metadata/entities/sources/source.entity';
import { FindOptionsWhere } from 'typeorm';
import { CreateEntryFormDTO } from '../dtos/create-entry-form.dto';
import { ViewSourceDto } from '../dtos/view-source.dto';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { SourcesService } from './sources.service';


@Injectable()
export class FormSourcesService {

    constructor(private sourcesService: SourcesService, private elementsService: ElementsService) { }


    public async findAll(): Promise<ViewSourceDto<ViewEntryFormDTO>[]> {

        const findOptionsWhere: FindOptionsWhere<SourceEntity> = {
            sourceType: SourceTypeEnum.FORM
        };

        const dto: ViewSourceDto<CreateEntryFormDTO>[] = await this.sourcesService.findAll(findOptionsWhere);

        const views: ViewSourceDto<ViewEntryFormDTO>[] = dto.map(item => {
            return this.createViewDto(item, []);
        });

        return views;
    }

    public async find(id: number): Promise<ViewSourceDto<ViewEntryFormDTO>> {

        const dto: ViewSourceDto<CreateEntryFormDTO> = await this.sourcesService.find(id);

        if (dto.sourceType !== SourceTypeEnum.FORM) {
            throw new NotFoundException(`Source #${id} is not a form`);
        }

        let elements: ViewElementDto[] = [];

        if (dto.extraMetadata && dto.extraMetadata.elementIds.length > 0) {
            elements = await this.elementsService.findSome(dto.extraMetadata.elementIds);
        }


        return this.createViewDto(dto, elements);
    }

    public async create(sourceDto: CreateUpdateSourceDto<CreateEntryFormDTO>): Promise<ViewSourceDto<ViewEntryFormDTO>> {

        const dto: ViewSourceDto<CreateEntryFormDTO> = await this.sourcesService.create(sourceDto);

        return this.find(dto.id)
    }

    public async update(id: number, sourceDto: CreateUpdateSourceDto<CreateEntryFormDTO>) {

        await this.sourcesService.update(id, sourceDto);

        return this.find(id)
    }

    public async delete(id: number): Promise<number> {
        return this.sourcesService.delete(id);
    }

    private createViewDto(dto: ViewSourceDto<CreateEntryFormDTO>, elementsMetadata: ViewElementDto[]): ViewSourceDto<ViewEntryFormDTO> {
        return {
            id: dto.id,
            name: dto.name,
            description: dto.description,
            extraMetadata: { ...dto.extraMetadata, elementsMetadata: elementsMetadata },
            sourceType: dto.sourceType,
            sourceTypeName: dto.sourceTypeName,
        };
    }


}

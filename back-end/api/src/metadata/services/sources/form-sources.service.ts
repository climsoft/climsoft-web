import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceEntity } from '../../entities/sources/source.entity';
import { FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUpdateSourceDto } from '../../dtos/sources/create-update-source.dto';
import { ViewSourceDto } from '../../dtos/sources/view-source.dto';
import { SourceTypeEnum } from '../../enums/source-type.enum';
import { StringUtils } from 'src/shared/utils/string.utils';
import { CreateEntryFormDTO } from '../../dtos/sources/create-entry-form.dto';
import { SourcesService } from './sources.service';
import { ViewEntryFormDTO } from 'src/metadata/dtos/sources/view-entry-form.dto';
import { ElementsService } from '../elements/elements.service';


@Injectable()
export class FormSourcesService {

    constructor(private sourcesService: SourcesService, private elementsService: ElementsService) { }

    public async find(id: number): Promise<ViewSourceDto<ViewEntryFormDTO>> {
        const dto: ViewSourceDto<string> = await this.sourcesService.findSource(id);
        if (dto.sourceType !== SourceTypeEnum.FORM) {
            throw new NotFoundException(`Source #${id} is not a form`);
        }
      
        const formDto: ViewSourceDto<ViewEntryFormDTO> =this.createViewDto(dto);
        if(formDto.extraMetadata){
            formDto.extraMetadata.elementsMetadata = await this.elementsService.findElements(formDto.extraMetadata.elementIds);
        }
    
        // TODO. test form type
        console.log("testing form retrieval", formDto);

        return formDto;
    }

    public async create(sourceDto: CreateUpdateSourceDto<string>) {
        //source entity will be created with an auto incremented id
        // const source = this.sourceRepo.create({
        //     ...sourceDto,
        // });
        // return this.sourceRepo.save(source);
    }

    public async update(id: number, sourceDto: CreateUpdateSourceDto<CreateEntryFormDTO>) {

        // //TODO. Implement 
        // const newSource: CreateUpdateSourceDto<string> ;

        // const x  = await this.sourcesService.updateSource(id, newSource);
    }

    public async delete(id: number) {
        return this.sourcesService.deleteSource(id);
    }

    private createViewDto(dto: ViewSourceDto<string>): ViewSourceDto<ViewEntryFormDTO> {
        return {
            id: dto.id,
            name: dto.name,
            description: dto.description,
            extraMetadata: dto.extraMetadata ? JSON.parse(dto.extraMetadata) : null,
            sourceType: dto.sourceType,
            sourceTypeName: dto.sourceTypeName,
        };
    }


}

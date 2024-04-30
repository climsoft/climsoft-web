import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceEntity } from '../../entities/sources/source.entity';
import { FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUpdateSourceDto } from '../../dtos/sources/create-update-source.dto';
import { ViewSourceDto } from '../../dtos/sources/view-source.dto'; 
import { StringUtils } from 'src/shared/utils/string.utils';

// TODO refactor this service later

@Injectable()
export class SourcesService {

    constructor(@InjectRepository(SourceEntity) private readonly sourceRepo: Repository<SourceEntity>,
    ) { }


    public async find<T extends object>(id: number): Promise<ViewSourceDto<T>> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll<T extends object>(selectOptions?: FindOptionsWhere<SourceEntity>): Promise<ViewSourceDto<T>[]> {
        const findOptions: FindManyOptions<SourceEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.sourceRepo.find(findOptions);
        return sourceEntities.map(source => {
            return this.createViewDto(source);
        });
    }

    public async findSourcesByIds<T extends object>(ids: number[]): Promise<ViewSourceDto<T>[]> {
        const findOptionsWhere: FindOptionsWhere<SourceEntity> = {
            id: In(ids)
        }; 
        return this.findAll(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<SourceEntity> {
        const entity = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }

    public async create<T extends object>(dto: CreateUpdateSourceDto<T>): Promise<ViewSourceDto<T>> {
        //source entity will be created with an auto incremented id
        const entity = this.sourceRepo.create({ 
            name: dto.name, 
            description: dto.description,
            extraMetadata: dto.extraMetadata? JSON.stringify (dto.extraMetadata): null,         
            sourceType: dto.sourceType
         });

        await this.sourceRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update<T extends object>(id: number, sourceDto: CreateUpdateSourceDto<T>) {
        const source = await this.findEntity(id);

        // TODO. Later Implement logging.

        source.name = sourceDto.name;
        source.description = sourceDto.description;
        source.extraMetadata = JSON.stringify(sourceDto.extraMetadata) ;
        source.sourceType = sourceDto.sourceType

        return this.sourceRepo.save(source);
    }

    public async delete(id: number): |Promise<number> {
        const source = await this.findEntity(id);
        await this.sourceRepo.remove(source);
        return id;
    }

    private createViewDto<T extends object>(entity: SourceEntity): ViewSourceDto<T> {

        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            extraMetadata: entity.extraMetadata ? JSON.parse(entity.extraMetadata ): null,
            sourceType: entity.sourceType,
            sourceTypeName: StringUtils.capitalizeFirstLetter(entity.sourceType),
        }
    }

    
 

    // async findSourcesBySourceTypes(sourceType?: SourceTypeEnum): Promise<ViewSourceDto<T>[]> {
    //     let dtos: ViewSourceDto<T>[];

    //     // TODO. Use the find sources

    //     if (sourceType) {
    //         const entities = await this.sourceRepo.find({
    //             where: {
    //                 sourceType: sourceType,
    //             },
    //         });

    //         dtos = entities.map(source => {
    //             return this.createViewDto(source);
    //         });


    //     } else {
    //         dtos = await this.findAll();
    //     }

    //     return dtos;
    // }

}

import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceEntity } from '../../entities/sources/source.entity';
import { FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUpdateSourceDto } from '../../dtos/sources/create-update-source.dto';
import { ViewSourceDto } from '../../dtos/sources/view-source.dto';
import { SourceTypeEnum } from '../../enums/source-type.enum';
import { StringUtils } from 'src/shared/utils/string.utils';

// TODO refactor this service later

@Injectable()
export class SourcesService {

    constructor(@InjectRepository(SourceEntity) private readonly sourceRepo: Repository<SourceEntity>,
    ) { }


    public async findSource(id: number): Promise<ViewSourceDto<string>> {
        return this.createViewDto(await this.findSourceRaw(id));
    }

    public async findSources(selectOptions?: FindOptionsWhere<SourceEntity>): Promise<ViewSourceDto<string>[]> {
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

    public async findSourcesByIds(ids?: number[]): Promise<ViewSourceDto<string>[]> {
        const findOptions: FindManyOptions<SourceEntity> = {
            order: {
                id: "ASC"
            }
        };

        // TODO. use the find sources
        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        const entities = await this.sourceRepo.find(findOptions);
        return entities.map(source => {
            return this.createViewDto(source);
        });
    }

    async findSourcesBySourceTypes(sourceType?: SourceTypeEnum): Promise<ViewSourceDto<string>[]> {
        let dtos: ViewSourceDto<string>[];

        // TODO. Use the find sources

        if (sourceType) {
            const entities = await this.sourceRepo.find({
                where: {
                    sourceType: sourceType,
                },
            });

            dtos = entities.map(source => {
                return this.createViewDto(source);
            });


        } else {
            dtos = await this.findSources();
        }

        return dtos;
    }

    public async findSourceRaw(id: number): Promise<SourceEntity> {
        const source = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!source) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return source;
    }

    public async create(sourceDto: CreateUpdateSourceDto<string>) {
        //source entity will be created with an auto incremented id
        const source = this.sourceRepo.create({
            ...sourceDto,
        });
        return this.sourceRepo.save(source);
    }

    public async updateSource(id: number, sourceDto: CreateUpdateSourceDto<string>) {
        const source = await this.findSourceRaw(id);

        //TODO. Implement logging.
        source.name = sourceDto.name;
        source.description = sourceDto.description;
        source.extraMetadata = sourceDto.extraMetadata;
        source.sourceType = sourceDto.sourceType

        return this.sourceRepo.save(source);
    }

    public async deleteSource(id: number) {
        const source = await this.findSourceRaw(id);
        return this.sourceRepo.remove(source);
    }

    private createViewDto(entity: SourceEntity): ViewSourceDto<string> {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            extraMetadata: entity.extraMetadata,
            sourceType: entity.sourceType,
            sourceTypeName: StringUtils.capitalizeFirstLetter(entity.sourceType),
        }
    }
  
}

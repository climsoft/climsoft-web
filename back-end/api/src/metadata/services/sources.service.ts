import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceEntity } from '../entities/source.entity';
import { FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { ViewSourceDto } from '../dtos/view-source.dto';
import { SourceTypeEnum } from '../enums/source-type.enum';

// TODO refactor this service later

@Injectable()
export class SourcesService {

    constructor(@InjectRepository(SourceEntity) private readonly sourceRepo: Repository<SourceEntity>,
    ) { }


    public async findSources(selectOptions?: FindOptionsWhere<SourceEntity>): Promise<ViewSourceDto[]> {
        const findOptions: FindManyOptions<SourceEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.sourceRepo.find(findOptions);
        return sourceEntities.map(source => ({ ...source }));
    }

    public async findSourcesByIds(ids?: number[]): Promise<ViewSourceDto[]> {
        const findOptions: FindManyOptions<SourceEntity> = {
            order: {
                id: "ASC"
            }
        };

        // TODO. use the find sources
        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        const sourceEntities = await this.sourceRepo.find(findOptions);
        return sourceEntities.map(source => ({ ...source }));
    }

    async findSourcesBySourceTypes(sourceType?: SourceTypeEnum): Promise<SourceEntity[]> {
        let sources: SourceEntity[];

        // TODO. Use the find sources

        if (sourceType) {
            sources = await this.sourceRepo.find({
                where: {
                    sourceType: sourceType,
                },
            });
        } else {
            sources = await this.findSources();
        }

        return sources;
    }

    public async findSource(id: number): Promise<SourceEntity> {
        const source = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!source) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return source;
    }

    public async create(sourceDto: CreateUpdateSourceDto) {
        //source entity will be created with an auto incremented id
        const source = this.sourceRepo.create({
            ...sourceDto,
        });
        return this.sourceRepo.save(source);
    }

    public async updateSource(id: number, sourceDto: CreateUpdateSourceDto) {
        const source = await this.findSource(id);

        //TODO. Implement logging?
        source.name = sourceDto.name;
        source.description = sourceDto.description;
        source.extraMetadata = sourceDto.extraMetadata;
        source.sourceType = sourceDto.sourceType

        return this.sourceRepo.save(source);
    }

    public async deleteSource(id: number) {
        const source = await this.findSource(id);
        return this.sourceRepo.remove(source);
    }
}

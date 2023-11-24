import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceEntity } from '../entities/source.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSourceDto } from '../dtos/create-source.dto';

@Injectable()
export class SourcesService {

    constructor(@InjectRepository(SourceEntity) private readonly sourceRepo: Repository<SourceEntity>,
    ) { }

    findForms() {
        return this.findSources(1);
    }

    async findSources(sourceTypeId?: number) {
        let sources;
        if (sourceTypeId) {
            sources = await this.sourceRepo.find({
                where: {
                    sourceTypeId: sourceTypeId,
                },
            });
        } else {
            sources = await this.sourceRepo.find();
        }

        if (!sources) {
            throw new NotFoundException(`Sources of type #${sourceTypeId} not found`);
        }
        return sources;
    }

    async findSource(id: number) {
        const source = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!source) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return source;
    }

    async create(sourceDto: CreateSourceDto) {
        const source = this.sourceRepo.create({
            ...sourceDto,
        });
        return this.sourceRepo.save(source);
    }

    async updateSource(id: number, sourceDto: CreateSourceDto) {
        const source = await this.sourceRepo.preload({
            id, ...sourceDto,
        });
        if (!source) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return this.sourceRepo.save(source);
    }

    async deleteSource(id: number) {
        const source = await this.findSource(id);
        return this.sourceRepo.remove(source);
    }
}

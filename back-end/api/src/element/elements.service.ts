import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ElementEntity } from './entities/element.entity';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
    ) { }

    find(ids?: number[]) {

        if (ids) {
            return this.elementRepo.findBy({
                id: In(ids),
            });
        }

        return this.elementRepo.find();
    }


    async findOne(id: number) {
        const element = await this.elementRepo.findOneBy({
            id: id,
        });

        if (!element) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return element;
    }


}

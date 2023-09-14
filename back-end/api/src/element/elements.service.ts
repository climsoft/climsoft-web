import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElementEntity } from './entities/element.entity';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
    ) {}

    findAll() {
        return this.elementRepo.find();
    }




}

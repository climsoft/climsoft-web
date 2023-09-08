import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(Element) private readonly elementRepo: Repository<Element>,
    ) {}

    findAll() {
        return this.elementRepo.find();
    }




}

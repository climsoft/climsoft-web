import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; 
import { Repository } from 'typeorm';

@Injectable()
export class FlagsService {
    // constructor(@InjectRepository(FlagEntity) private readonly flagsRepo: Repository<FlagEntity>,
    // ) {}

    // async find() {
    //     return this.flagsRepo.find();
    // }
}

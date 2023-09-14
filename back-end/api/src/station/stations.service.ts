import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './entities/station.entity';
import { StationDto } from './dto/station.dto';

@Injectable()
export class StationsService {

    constructor(@InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    ) { }

    find() {
        return this.stationRepo.find();
    }

    async findOne(id: string) {
        const station = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!station) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return station;
    }

    async create(stationDto: StationDto) {
        const station = this.stationRepo.create({
            ...stationDto,
        });
        return this.stationRepo.save(station);
    }

    async update(id: string, stationDto: StationDto) {
        const station = await this.stationRepo.preload({
            id, ...stationDto,
        });
        if (!station) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return this.stationRepo.save(station);
    }

    async remove(id: string) {
        const station = await this.findOne(id);
        return this.stationRepo.remove(station);
    }


}

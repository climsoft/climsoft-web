import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateViewGeneralSettingDto } from '../dtos/create-view-general-setting.dto';
import { GeneralSettingEntity } from '../entities/general-setting.entity';
import { UpdateGeneralSettingDto } from '../dtos/update-general-setting.dto';

@Injectable()
export class GeneralSettingsService {

    constructor(
        @InjectRepository(GeneralSettingEntity) private generalSettingRepo: Repository<GeneralSettingEntity>
    ) { }

    private async findEntity(id: number): Promise<GeneralSettingEntity> {
        const entity = await this.generalSettingRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Entity #${id} not found`);
        }
        return entity;
    }

    public async find(id: number): Promise<CreateViewGeneralSettingDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<GeneralSettingEntity>): Promise<CreateViewGeneralSettingDto[]> {
        const findOptions: FindManyOptions<GeneralSettingEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        return (await this.generalSettingRepo.find(findOptions)).map(item => {
            return this.createViewDto(item);
        });
    }

    /**
     * Used when user is updating the settings parameters
     * @param id 
     * @param dto 
     * @param userId 
     * @returns 
     */
    public async update(id: number, dto: UpdateGeneralSettingDto, userId: number) : Promise<CreateViewGeneralSettingDto>{
        const entity = await this.findEntity(id);
        entity.parameters = dto.parameters;
        entity.entryUserId = userId;
        return this.createViewDto(await this.generalSettingRepo.save(entity));
    }

    /**
     * Used by migration service to save default settings
     * @param dtos 
     * @param userId 
     * @returns 
     */
    public async bulkPut(dtos: CreateViewGeneralSettingDto[], userId: number): Promise<number> {
        const entities: GeneralSettingEntity[] = [];
        for (const dto of dtos) {
            let entity = await this.generalSettingRepo.findOneBy({
                id: dto.id,
            });

            if (!entity) {
                entity = await this.generalSettingRepo.create({
                    id: dto.id,
                });
            }

            entity.name = dto.name;
            entity.description = dto.description;
            entity.parameters = dto.parameters;
            entity.entryUserId = userId;
            entities.push(entity);
        }

        const savedEntities = await this.generalSettingRepo.save(entities);
        return savedEntities.length;
    }

    public async count() {
        return this.generalSettingRepo.count();
    }

    private createViewDto(entity: GeneralSettingEntity): CreateViewGeneralSettingDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            parameters: entity.parameters
        };
    }

}

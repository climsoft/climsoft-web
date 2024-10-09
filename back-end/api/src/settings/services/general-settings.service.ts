import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewGeneralSettingDto } from '../dtos/view-general-setting.dto'; 
import { GeneralSettingEntity } from '../entities/general-setting.entity';
import { UpdateGeneralSettingDto } from '../dtos/update-general-setting.dto';

@Injectable()
export class GeneralSettingsService {

    constructor(
        @InjectRepository(GeneralSettingEntity) private generalSettingRepo: Repository<GeneralSettingEntity>
    ) { }


    private async findEntity(id: string): Promise<GeneralSettingEntity> {
        const entity = await this.generalSettingRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Entity #${id} not found`);
        }
        return entity;
    }

    public async find(id: string): Promise<ViewGeneralSettingDto> { 
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<GeneralSettingEntity>): Promise<ViewGeneralSettingDto[]> {
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

    public async update(id: string, dto: UpdateGeneralSettingDto, userId: number) {
        const source = await this.findEntity(id);
        source.parameters = dto.parameters;
        source.entryUserId = userId;

        // TODO. Later Implement logging of changes in the database.
        return this.generalSettingRepo.save(source);
    }

    public async count(){
        return this.generalSettingRepo.count();
    }

    private createViewDto(entity: GeneralSettingEntity): ViewGeneralSettingDto {
        return {
            id: entity.id,
            description: entity.description,
            parameters: entity.parameters
        };
    }

}

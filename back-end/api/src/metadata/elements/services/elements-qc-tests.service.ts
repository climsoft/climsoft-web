import { Injectable, NotFoundException } from '@nestjs/common';
import { Equal, FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ElementQCTestEntity } from '../entities/element-qc-test.entity';
import { ViewElementQCTestDto } from '../dtos/qc-tests/view-element-qc-test.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateElementQCTestDto } from '../dtos/qc-tests/create-element-qc-test.dto';
import { FindQCTestQueryDto } from '../dtos/qc-tests/find-qc-test-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';

// TODO refactor this service later

@Injectable()
export class ElementsQCTestsService {

    constructor(@InjectRepository(ElementQCTestEntity) private readonly qcTestsRepo: Repository<ElementQCTestEntity>) { }

    public async find(findQCQuery?: FindQCTestQueryDto): Promise<ViewElementQCTestDto[]> {
        const selectOptions: FindOptionsWhere<ElementQCTestEntity> = {};

        if (findQCQuery) {
            if (findQCQuery.observationInterval) {
                selectOptions.observationInterval = Equal(findQCQuery.observationInterval)
            }

            if (findQCQuery.qcTestTypes) {
                selectOptions.qcTestType = In(findQCQuery.qcTestTypes)
            }

            if (findQCQuery.elementIds) {
                selectOptions.elementId = In(findQCQuery.elementIds)
            }
        }
        return this.findInternal(selectOptions);
    }

    public async findById(id: number): Promise<ViewElementQCTestDto> {
        return this.createViewDto(await this.findEntity(id));
    }



    public async findQCTestByType(qcTestType: QCTestTypeEnum): Promise<ViewElementQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<ElementQCTestEntity> = {
            qcTestType: qcTestType
        };
        return this.findInternal(findOptionsWhere);
    }

    public async findQCTestByElement(elementId: number): Promise<ViewElementQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<ElementQCTestEntity> = {
            elementId: elementId
        };
        return this.findInternal(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<ElementQCTestEntity> {
        const entity = await this.qcTestsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`QC Test #${id} not found`);
        }
        return entity;
    }

    private async findInternal(selectOptions?: FindOptionsWhere<ElementQCTestEntity>): Promise<ViewElementQCTestDto[]> {
        const findOptions: FindManyOptions<ElementQCTestEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.qcTestsRepo.find(findOptions);
        const dtos: ViewElementQCTestDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(await this.createViewDto(entity));
        }
        return dtos;
    }

    public async create(dto: CreateElementQCTestDto, userId: number): Promise<ViewElementQCTestDto> {
        //source entity will be created with an auto incremented id
        const entity = this.qcTestsRepo.create({
            name: dto.name,
            description: dto.description,
            elementId: dto.elementId,
            observationLevel: dto.observationLevel,
            observationInterval: dto.observationInterval,
            qcTestType: dto.qcTestType,
            parameters: dto.parameters,
            disabled: dto.disabled,
            comment: dto.comment,
            entryUserId: userId
        });

        await this.qcTestsRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateElementQCTestDto) {
        const qctest = await this.findEntity(id);
        qctest.name = dto.name;
        qctest.description = dto.description ? dto.description : null;
        qctest.elementId = dto.elementId;
        qctest.observationLevel = dto.observationLevel;
        qctest.observationInterval = dto.observationInterval;
        qctest.qcTestType = dto.qcTestType;
        qctest.parameters = dto.parameters;
        qctest.disabled = dto.disabled;
        qctest.comment = dto.comment;
        return this.qcTestsRepo.save(qctest);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.qcTestsRepo.remove(source);
        return id;
    }

    private async createViewDto(entity: ElementQCTestEntity): Promise<ViewElementQCTestDto> {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            elementId: entity.elementId,
            observationLevel: entity.observationLevel,
            observationInterval: entity.observationInterval,
            qcTestType: entity.qcTestType,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment
        };
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.qcTestsRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<ElementQCTestEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.qcTestsRepo.count({ where: whereOptions })) > 0
        }

        if (changesDetected) {
            // If any changes detected then return all records 
            const allRecords = await this.findInternal();
            return { metadataChanged: true, metadataRecords: allRecords }
        } else {
            // If no changes detected then indicate no metadata changed
            return { metadataChanged: false }
        }
    }

}

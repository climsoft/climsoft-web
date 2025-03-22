import { Injectable, NotFoundException } from '@nestjs/common';
import { Equal, FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ElementQCTestEntity } from '../entities/element-qc-test.entity';
import { ViewElementQCTestDto } from '../dtos/qc-tests/view-element-qc-test.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateElementQCTestDto } from '../dtos/qc-tests/create-element-qc-test.dto';
import { FindQCTestQueryDto } from '../dtos/qc-tests/find-qc-test-query.dto';

// TODO refactor this service later

@Injectable()
export class ElementsQCTestsService {

    constructor(@InjectRepository(ElementQCTestEntity) private readonly qcTestsRepo: Repository<ElementQCTestEntity>) { }

    public async findById(id: number): Promise<ViewElementQCTestDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findBy(findQCQuery: FindQCTestQueryDto): Promise<ViewElementQCTestDto[]> {
        const selectOptions: FindOptionsWhere<ElementQCTestEntity> = {};

        if (findQCQuery.observationPeriod) {
            selectOptions.observationPeriod = Equal(findQCQuery.observationPeriod)
        }

        if (findQCQuery.qcTestTypes) {
            selectOptions.qcTestType = In(findQCQuery.qcTestTypes)
        }

        if (findQCQuery.elementIds) {
            selectOptions.elementId = In(findQCQuery.elementIds)
        }

        return this.findAll(selectOptions);
    }

    public async findAll(selectOptions?: FindOptionsWhere<ElementQCTestEntity>): Promise<ViewElementQCTestDto[]> {
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

    public async findQCTestByType(qcTestType: QCTestTypeEnum): Promise<ViewElementQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<ElementQCTestEntity> = {
            qcTestType: qcTestType
        };
        return this.findAll(findOptionsWhere);
    }

    public async findQCTestByElement(elementId: number): Promise<ViewElementQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<ElementQCTestEntity> = {
            elementId: elementId
        };
        return this.findAll(findOptionsWhere);
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

    public async create(dto: CreateElementQCTestDto, userId: number): Promise<ViewElementQCTestDto> {
        //source entity will be created with an auto incremented id
        const entity = this.qcTestsRepo.create({
            name: dto.name,
            description: dto.description,
            qcTestType: dto.qcTestType,
            elementId: dto.elementId,
            observationPeriod: dto.observationInterval,
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
        qctest.description = dto.description? dto.description: null;
        qctest.qcTestType = dto.qcTestType;
        qctest.elementId = dto.elementId;
        qctest.observationPeriod = dto.observationInterval;
        qctest.parameters = dto.parameters;
        qctest.disabled = dto.disabled;
        qctest.comment = dto.comment;

        // TODO. Later Implement logging of changes in the database.
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
            qcTestType: entity.qcTestType,
            elementId: entity.elementId,
            observationInterval: entity.observationPeriod,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment
        };
    }

}

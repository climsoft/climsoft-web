import { Injectable, NotFoundException } from '@nestjs/common';
import { Equal, FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ElementQCTestEntity } from '../entities/element-qc-test.entity';
import { UpdateQCTestDto } from '../dtos/qc-tests/update-qc-test.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCTestDto } from '../dtos/qc-tests/create-qc-test.dto';
import { FindQCTestQueryDto } from '../dtos/qc-tests/find-qc-test-query.dto';

// TODO refactor this service later

@Injectable()
export class ElementsQCTestsService {

    constructor(@InjectRepository(ElementQCTestEntity) private readonly qcTestsRepo: Repository<ElementQCTestEntity>) { }

    public async findById(id: number): Promise<UpdateQCTestDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findBy(findQCQuery: FindQCTestQueryDto): Promise<UpdateQCTestDto[]> {
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

    public async findAll(selectOptions?: FindOptionsWhere<ElementQCTestEntity>): Promise<UpdateQCTestDto[]> {
        const findOptions: FindManyOptions<ElementQCTestEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.qcTestsRepo.find(findOptions);
        const dtos: UpdateQCTestDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(await this.createViewDto(entity));
        }
        return dtos;
    }

    public async findQCTestByType(qcTestType: QCTestTypeEnum): Promise<UpdateQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<ElementQCTestEntity> = {
            qcTestType: qcTestType
        };
        return this.findAll(findOptionsWhere);
    }

    public async findQCTestByElement(elementId: number): Promise<UpdateQCTestDto[]> {
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

    public async create(dto: CreateQCTestDto, userId: number): Promise<UpdateQCTestDto> {
        //source entity will be created with an auto incremented id
        const entity = this.qcTestsRepo.create({
            // TODO. This should come from dto
            name: `${dto.qcTestType} ${dto.elementId} ${dto.observationPeriod}`,
            description: null,

            qcTestType: dto.qcTestType,
            elementId: dto.elementId,
            observationPeriod: dto.observationPeriod,
            parameters: dto.parameters,
            disabled: dto.disabled,
            comment: dto.comment,
            entryUserId: userId
        });

        await this.qcTestsRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateQCTestDto) {
        const qctest = await this.findEntity(id);
        qctest.qcTestType = dto.qcTestType;
        qctest.elementId = dto.elementId;
        qctest.observationPeriod = dto.observationPeriod;
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

    private async createViewDto(entity: ElementQCTestEntity): Promise<UpdateQCTestDto> {
        return {
            id: entity.id,
            qcTestType: entity.qcTestType,
            elementId: entity.elementId,
            observationPeriod: entity.observationPeriod,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment
        };
    }

}

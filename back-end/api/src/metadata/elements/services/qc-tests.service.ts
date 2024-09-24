import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm'; 
import { QCTestEntity } from '../entities/qc-test.entity';
import { UpdateQCTestDto } from '../dtos/qc-tests/update-qc-test.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCTestDto } from '../dtos/qc-tests/create-qc-test.dto';

// TODO refactor this service later

@Injectable()
export class QCTestsService {

    constructor(@InjectRepository(QCTestEntity) private readonly qcTestsRepo: Repository<QCTestEntity>) { }

    public async find(id: number): Promise<UpdateQCTestDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<QCTestEntity>): Promise<UpdateQCTestDto[]> {
        const findOptions: FindManyOptions<QCTestEntity> = {
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

    // public async findQCTtestsByIds(ids: number[]): Promise<UpdateQCTestDto[]> {
    //     const findOptionsWhere: FindOptionsWhere<QCTestEntity> = {
    //         id: In(ids)
    //     };
    //     return this.findAll(findOptionsWhere);
    // }

    public async findQCTestByType(qcTestType: QCTestTypeEnum): Promise<UpdateQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<QCTestEntity> = {
            qcTestType: qcTestType
        };
        return this.findAll(findOptionsWhere);
    }

    public async findQCTestByElement(elementId: number): Promise<UpdateQCTestDto[]> {
        const findOptionsWhere: FindOptionsWhere<QCTestEntity> = {
            elementId: elementId
        };
        return this.findAll(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<QCTestEntity> {
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

    private async createViewDto(entity: QCTestEntity): Promise<UpdateQCTestDto> {
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

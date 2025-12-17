import { Injectable, NotFoundException } from '@nestjs/common';
import { Equal, FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QCSpecificationEntity } from '../entities/qc-specification.entity';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCSpecificationDto } from '../dtos/create-qc-specification.dto';
import { FindQCSpecificationQueryDto } from '../dtos/find-qc-specification-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { ViewQCSpecificationDto } from '../dtos/view-qc-specification.dto';

// TODO refactor this service later

@Injectable()
export class QCSpecificationsService {

    constructor(@InjectRepository(QCSpecificationEntity) private readonly qcTestsRepo: Repository<QCSpecificationEntity>) { }

    public async find(findQCQuery?: FindQCSpecificationQueryDto): Promise<ViewQCSpecificationDto[]> {
        const selectOptions: FindOptionsWhere<QCSpecificationEntity> = {};

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

    public async findById(id: number): Promise<ViewQCSpecificationDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findQCTestByType(qcTestType: QCTestTypeEnum): Promise<ViewQCSpecificationDto[]> {
        const findOptionsWhere: FindOptionsWhere<QCSpecificationEntity> = {
            qcTestType: qcTestType
        };
        return this.findInternal(findOptionsWhere);
    }

    public async findQCTestByElement(elementId: number): Promise<ViewQCSpecificationDto[]> {
        const findOptionsWhere: FindOptionsWhere<QCSpecificationEntity> = {
            elementId: elementId
        };
        return this.findInternal(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<QCSpecificationEntity> {
        const entity = await this.qcTestsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`QC Test #${id} not found`);
        }
        return entity;
    }

    private async findInternal(selectOptions?: FindOptionsWhere<QCSpecificationEntity>): Promise<ViewQCSpecificationDto[]> {
        const findOptions: FindManyOptions<QCSpecificationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.qcTestsRepo.find(findOptions);
        const dtos: ViewQCSpecificationDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(await this.createViewDto(entity));
        }
        return dtos;
    }

    public async create(dto: CreateQCSpecificationDto, userId: number): Promise<ViewQCSpecificationDto> {
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

    public async update(id: number, dto: CreateQCSpecificationDto, userId: number) {
        const qctest = await this.findEntity(id);
        qctest.name = dto.name;
        qctest.description = dto.description ? dto.description : null;
        qctest.elementId = dto.elementId;
        qctest.observationLevel = dto.observationLevel;
        qctest.observationInterval = dto.observationInterval;
        qctest.qcTestType = dto.qcTestType;
        qctest.parameters = dto.parameters;
        qctest.disabled = dto.disabled;
        qctest.comment = dto.comment ? dto.comment : null;
        qctest.entryUserId = userId;
        return this.qcTestsRepo.save(qctest);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.qcTestsRepo.remove(source);
        return id;
    }

    public async deleteAll(): Promise<void> {
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.qcTestsRepo.remove(await this.qcTestsRepo.find());
    }

    private async createViewDto(entity: QCSpecificationEntity): Promise<ViewQCSpecificationDto> {
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
            const whereOptions: FindOptionsWhere<QCSpecificationEntity> = {};

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

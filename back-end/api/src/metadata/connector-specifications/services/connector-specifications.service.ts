import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { CreateConnectorSpecificationDto } from '../dtos/create-connector-specification.dto';
import { ViewConnectorSpecificationDto } from '../dtos/view-connector-specification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ConnectorSpecificationsService {
    constructor(
        @InjectRepository(ConnectorSpecificationEntity)
        private connectorRepo: Repository<ConnectorSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) { }

    public async find(id: number): Promise<ViewConnectorSpecificationDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<ConnectorSpecificationEntity>): Promise<ViewConnectorSpecificationDto[]> {
        const findOptions: FindManyOptions<ConnectorSpecificationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const entities = await this.connectorRepo.find(findOptions);
        const dtos: ViewConnectorSpecificationDto[] = [];
        for (const entity of entities) {
            dtos.push(this.createViewDto(entity));
        }
        return dtos;
    }

    public async findActiveConnectors(): Promise<ViewConnectorSpecificationDto[]> {
        return this.findAll({ disabled: false });
    }

    private async findEntity(id: number): Promise<ConnectorSpecificationEntity> {
        const entity = await this.connectorRepo.findOneBy({ id });

        if (!entity) {
            throw new NotFoundException(`Connector specification #${id} not found`);
        }
        return entity;
    }

    public async create(dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationDto> {
        // Connector specifications are required to have unique names
        let entity = await this.connectorRepo.findOneBy({
            name: dto.name,
        });

        if (entity) {
            throw new BadRequestException(`Connector specification with name ${dto.name} already exists`);
        }

        entity = this.connectorRepo.create({
            name: dto.name,
        });

        entity.description = dto.description || null;
        entity.connectorType = dto.connectorType;
        entity.serverIPAddress = dto.serverIPAddress;
        entity.protocol = dto.protocol;
        entity.port = dto.port;
        entity.username = dto.username;
        entity.password = dto.password; // TODO: Encrypt password before storing
        entity.timeout = dto.timeout;
        entity.retries = dto.retries;
        entity.cronSchedule = dto.cronSchedule; 
        entity.specificationIds = dto.specificationIds;
        entity.extraMetadata = dto.extraMetadata || null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);

        const viewDto = this.createViewDto(entity);

        this.eventEmitter.emit('connector.created', { id: entity.id, viewDto });

        return viewDto;
    }

    public async update(id: number, dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationDto> {
        const entity = await this.findEntity(id);

        entity.name = dto.name;
        entity.description = dto.description || null;
        entity.connectorType = dto.connectorType;
        entity.serverIPAddress = dto.serverIPAddress;
        entity.protocol = dto.protocol;
        entity.port = dto.port;
        entity.username = dto.username;
        entity.password = dto.password; // TODO: Encrypt password before storing
        entity.timeout = dto.timeout;
        entity.retries = dto.retries;
        entity.cronSchedule = dto.cronSchedule; 
        entity.specificationIds = dto.specificationIds;
        entity.extraMetadata = dto.extraMetadata || null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);

        const viewDto = this.createViewDto(entity);

        this.eventEmitter.emit('connector.updated', { id, viewDto });

        return viewDto;
    }

    public async delete(id: number): Promise<number> {
        const entity = await this.findEntity(id);
        await this.connectorRepo.remove(entity);
        this.eventEmitter.emit('connector.deleted', { id });
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities = await this.connectorRepo.find();
        await this.connectorRepo.remove(entities);
        this.eventEmitter.emit('connector.deleted', {});
        return true;
    }

    private createViewDto(entity: ConnectorSpecificationEntity): ViewConnectorSpecificationDto {
        const dto: ViewConnectorSpecificationDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            connectorType: entity.connectorType,
            serverIPAddress: entity.serverIPAddress,
            protocol: entity.protocol,
            port: entity.port,
            username: entity.username,
            password: entity.password, // TODO: Consider excluding password in view DTO
            timeout: entity.timeout,
            retries: entity.retries,
            cronSchedule: entity.cronSchedule,
            specificationIds: entity.specificationIds,
            extraMetadata: entity.extraMetadata,
            disabled: entity.disabled,
            comment: entity.comment,
        };
        return dto;
    }
}

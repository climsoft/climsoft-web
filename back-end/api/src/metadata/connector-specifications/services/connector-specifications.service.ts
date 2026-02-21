import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { CreateConnectorSpecificationDto } from '../dtos/create-connector-specification.dto';
import { ViewConnectorSpecificationDto } from '../dtos/view-connector-specification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class ConnectorSpecificationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewConnectorSpecificationDto>;

    constructor(
        @InjectRepository(ConnectorSpecificationEntity)
        private connectorRepo: Repository<ConnectorSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) {
        this.cache = new MetadataCache<ViewConnectorSpecificationDto>(
            'ConnectorSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewConnectorSpecificationDto>> {
        const entities = await this.connectorRepo.find({ order: { id: "ASC" } });
        // Cache stores records with encrypted (not masked) passwords
        const records = entities.map(entity => this.createViewDtoFromEntity(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number, maskPassword: boolean = false): ViewConnectorSpecificationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Connector specification #${id} not found`);
        }
        return maskPassword ? this.withMaskedPassword(dto) : dto;
    }

    public findAll(maskPassword: boolean = false): ViewConnectorSpecificationDto[] {
        const all = this.cache.getAll();
        return maskPassword ? all.map(dto => this.withMaskedPassword(dto)) : all;
    }

    public findActiveConnectors(maskPassword: boolean = false): ViewConnectorSpecificationDto[] {
        const active = this.cache.getAll().filter(dto => !dto.disabled);
        return maskPassword ? active.map(dto => this.withMaskedPassword(dto)) : active;
    }

    public async create(dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationDto> {
        // Connector specifications are required to have unique names
        let entity = await this.connectorRepo.findOneBy({
            name: dto.name,
        });

        if (entity) {
            throw new BadRequestException(`Connector specification with name ${dto.name} already exists`);
        }

        if (dto.parameters.password === '***ENCRYPTED***') {
            throw new BadRequestException(`Password ***ENCRYPTED*** not supported`);
        }

        entity = this.connectorRepo.create({
            name: dto.name,
        });

        entity.description = dto.description || null;
        entity.connectorType = dto.connectorType;
        entity.endPointType = dto.endPointType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.maxAttempts = dto.maxAttempts;
        entity.cronSchedule = dto.cronSchedule;

        // Encrypt password before storing
        dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);

        entity.parameters = dto.parameters;
        entity.orderNumber = dto.orderNumber || null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);
        await this.cache.invalidate();

        const viewDto = this.createViewDtoFromEntity(entity);

        this.eventEmitter.emit('connector.created', { id: entity.id, viewDto });

        return viewDto;
    }

    public async update(id: number, dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationDto> {
        const entity = await this.findEntity(id);

        // Only encrypt if password has changed or not already encrypted or not masked
        if (dto.parameters.password === '***ENCRYPTED***' || EncryptionUtils.isEncrypted(dto.parameters.password)) {
            dto.parameters.password = entity.parameters.password; // Keep existing encrypted password
        } else {
            dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);
        }

        entity.name = dto.name;
        entity.description = dto.description || null;
        entity.connectorType = dto.connectorType;
        entity.endPointType = dto.endPointType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.maxAttempts = dto.maxAttempts;
        entity.cronSchedule = dto.cronSchedule;
        entity.parameters = dto.parameters;
        entity.orderNumber = dto.orderNumber ? dto.orderNumber : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);
        await this.cache.invalidate();

        const viewDto = this.createViewDtoFromEntity(entity);

        this.eventEmitter.emit('connector.updated', { id, viewDto });

        return viewDto;
    }

    public async delete(id: number): Promise<number> {
        const entity = await this.findEntity(id);
        await this.connectorRepo.remove(entity);
        await this.cache.invalidate();
        this.eventEmitter.emit('connector.deleted', { id });
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities = await this.connectorRepo.find();
        await this.connectorRepo.remove(entities);
        await this.cache.invalidate();
        this.eventEmitter.emit('connector.deleted', {});
        return true;
    }

    private async findEntity(id: number): Promise<ConnectorSpecificationEntity> {
        const entity = await this.connectorRepo.findOneBy({ id });

        if (!entity) {
            throw new NotFoundException(`Connector specification #${id} not found`);
        }
        return entity;
    }

    /** Creates a view DTO from entity. Stores encrypted (not masked) password. */
    private createViewDtoFromEntity(entity: ConnectorSpecificationEntity): ViewConnectorSpecificationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description ? entity.description : '',
            connectorType: entity.connectorType,
            endPointType: entity.endPointType,
            hostName: entity.hostName,
            timeout: entity.timeout,
            maxAttempts: entity.maxAttempts,
            cronSchedule: entity.cronSchedule,
            orderNumber: entity.orderNumber ? entity.orderNumber : undefined,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment ? entity.comment : '',
            entryUserId: entity.entryUserId,
            log: entity.log,
        };
    }

    /** Returns a copy of the DTO with the password masked. Does not mutate the original. */
    private withMaskedPassword(dto: ViewConnectorSpecificationDto): ViewConnectorSpecificationDto {
        return {
            ...dto,
            parameters: { ...dto.parameters, password: '***ENCRYPTED***' },
        };
    }

}

import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { CreateConnectorSpecificationDto } from '../dtos/create-connector-specification.dto';
import { ViewConnectorSpecificationModel } from '../dtos/view-connector-specification.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class ConnectorSpecificationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewConnectorSpecificationModel>;

    constructor(
        @InjectRepository(ConnectorSpecificationEntity)
        private connectorRepo: Repository<ConnectorSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) {
        this.cache = new MetadataCache<ViewConnectorSpecificationModel>(
            'ConnectorSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewConnectorSpecificationModel>> {
        const entities: ConnectorSpecificationEntity[] = await this.connectorRepo.find({ order: { id: "ASC" } });
        // Cache stores records with encrypted (not masked) passwords
        const records: ViewConnectorSpecificationModel[] = entities.map(entity => this.createViewDtoFromEntity(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number, maskPassword: boolean = false): ViewConnectorSpecificationModel {
        const dto: ViewConnectorSpecificationModel | undefined = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Connector specification #${id} not found`);
        }

        return maskPassword ? this.withMaskedPassword(dto) : dto;
    }

    public findAll(maskPassword: boolean = false): ViewConnectorSpecificationModel[] {
        const all = this.cache.getAll();
        return maskPassword ? all.map(dto => this.withMaskedPassword(dto)) : all;
    }

    public findActiveConnectors(maskPassword: boolean = false): ViewConnectorSpecificationModel[] {
        const active: ViewConnectorSpecificationModel[] = this.cache.getAll().filter(dto => !dto.disabled);
        return maskPassword ? active.map(dto => this.withMaskedPassword(dto)) : active;
    }

    public async create(dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationModel> {
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



        // Encrypt password before storing
        dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);

        this.updateEntityFromDto(entity, dto, userId);

        await this.connectorRepo.save(entity);
        await this.cache.invalidate();

        const viewDto = this.createViewDtoFromEntity(entity);

        this.eventEmitter.emit('connector.created', { id: entity.id, viewDto });

        return viewDto;
    }

    public async update(id: number, dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationModel> {
        const entity: ConnectorSpecificationEntity = await this.findEntity(id);

        // Only encrypt if password has changed or not already encrypted or not masked
        if (dto.parameters.password === '***ENCRYPTED***' || EncryptionUtils.isEncrypted(dto.parameters.password)) {
            dto.parameters.password = entity.parameters.password; // Keep existing encrypted password
        } else {
            dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);
        }

        this.updateEntityFromDto(entity, dto, userId);

        await this.connectorRepo.save(entity);

        await this.cache.invalidate();

        const viewDto: ViewConnectorSpecificationModel = this.createViewDtoFromEntity(entity);

        this.eventEmitter.emit('connector.updated', { id, viewDto });

        return viewDto;
    }

    /**
     * Flips just the `disabled` flag without touching any other field. Emits
     * `connector.disabledChanged` only on a real state transition so the
     * scheduler can react (register/unregister the cron schedule and enqueue
     * an immediate run when enabling).
     */
    public async setDisabled(id: number, disabled: boolean, userId: number): Promise<ViewConnectorSpecificationModel> {
        const entity: ConnectorSpecificationEntity = await this.findEntity(id);

        // No-op early return: avoids firing the event (and the scheduler's
        // immediate enqueue) for callers that POST the current value.
        if (entity.disabled === disabled) {
            return this.createViewDtoFromEntity(entity);
        }

        entity.disabled = disabled;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);
        await this.cache.invalidate();

        const viewDto: ViewConnectorSpecificationModel = this.createViewDtoFromEntity(entity);

        this.eventEmitter.emit('connector.disabledChanged', { id, viewDto });

        return viewDto;
    }

    private updateEntityFromDto(entity: ConnectorSpecificationEntity, dto: CreateConnectorSpecificationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.connectorType = dto.connectorType;
        entity.serverType = dto.serverType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.retryAttempts = dto.retryAttempts;
        entity.cronSchedule = dto.cronSchedule;
        entity.parameters = dto.parameters;
        entity.disabled = dto.disabled;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
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
    private createViewDtoFromEntity(entity: ConnectorSpecificationEntity): ViewConnectorSpecificationModel {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            connectorType: entity.connectorType,
            serverType: entity.serverType,
            hostName: entity.hostName,
            timeout: entity.timeout,
            retryAttempts: entity.retryAttempts,
            cronSchedule: entity.cronSchedule,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            log: entity.log,
        };
    }

    /** Returns a copy of the DTO with the password masked. Does not mutate the original. */
    private withMaskedPassword(dto: ViewConnectorSpecificationModel): ViewConnectorSpecificationModel {
        return {
            ...dto,
            parameters: { ...dto.parameters, password: '***ENCRYPTED***' },
        };
    }

}

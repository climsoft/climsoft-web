import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { CreateConnectorSpecificationDto, ImportFileServerParametersDto } from '../dtos/create-connector-specification.dto';
import { ViewConnectorSpecificationDto } from '../dtos/view-connector-specification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';

@Injectable()
export class ConnectorSpecificationsService {
    private readonly logger = new Logger(ConnectorSpecificationsService.name);

    constructor(
        @InjectRepository(ConnectorSpecificationEntity)
        private connectorRepo: Repository<ConnectorSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) { }

    public async find(id: number, maskPassword: boolean = false): Promise<ViewConnectorSpecificationDto> {
        const entity = await this.findEntity(id);
        return this.createViewDto(entity, maskPassword);
    }

    public async findAll(selectOptions?: FindOptionsWhere<ConnectorSpecificationEntity>, maskPassword: boolean = false): Promise<ViewConnectorSpecificationDto[]> {
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
            dtos.push(await this.createViewDto(entity, maskPassword)); // Don't decrypt for list view
        }
        return dtos;
    }

    public async findActiveConnectors(maskPassword: boolean = false): Promise<ViewConnectorSpecificationDto[]> {
        return this.findAll({ disabled: false }, maskPassword);
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
        dto.orderNumber ? entity.orderNumber = dto.orderNumber : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);

        const viewDto = await this.createViewDto(entity);

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
        dto.orderNumber ? entity.orderNumber = dto.orderNumber : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);

        const viewDto = await this.createViewDto(entity);

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

    /**
     * Create view DTO from entity
     * @param entity - The connector entity
     * @param decryptPassword - Whether to decrypt the password (true for usage, false for API responses)
     */
    private async createViewDto(entity: ConnectorSpecificationEntity, maskPassword: boolean = false): Promise<ViewConnectorSpecificationDto> {
        const dto: ViewConnectorSpecificationDto = {
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

        if (maskPassword) {
            // Mask password for API responses
            dto.parameters.password = '***ENCRYPTED***';
        }
        return dto;
    }

}

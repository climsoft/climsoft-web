import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { CreateConnectorSpecificationDto, FTPMetadataDto } from '../dtos/create-connector-specification.dto';
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

    public async find(id: number): Promise<ViewConnectorSpecificationDto> {
        const entity = await this.findEntity(id);
        return this.createViewDto(entity);
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
            dtos.push(await this.createViewDto(entity)); // Don't decrypt for list view
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
        entity.endPointType = dto.endPointType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.maximumRetries = dto.maximumRetries;
        entity.cronSchedule = dto.cronSchedule;

        // Encrypt password before storing
        dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);

        entity.parameters = dto.parameters;
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

        // Only encrypt if password has changed or not already encrypted 
        if (entity.parameters.password !== dto.parameters.password || !EncryptionUtils.isEncrypted(dto.parameters.password)) {
            dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);
        }else{
             dto.parameters.password =  entity.parameters.password; // Keep existing encrypted password
        }

        entity.name = dto.name;
        entity.description = dto.description || null;
        entity.connectorType = dto.connectorType;
        entity.endPointType = dto.endPointType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.maximumRetries = dto.maximumRetries;
        entity.cronSchedule = dto.cronSchedule;
        entity.parameters = dto.parameters;
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
    private async createViewDto(entity: ConnectorSpecificationEntity): Promise<ViewConnectorSpecificationDto> {
        // const parameters : FTPMetadataDto= entity.parameters;

        // if (decryptPassword) {
        //     try {
        //         // Decrypt password for actual usage (connecting to servers)
        //         password = await EncryptionUtils.decrypt(entity.parameters.password);
        //     } catch (error) {
        //         this.logger.error(`Failed to decrypt password for connector ${entity.id}`, error);
        //         throw new BadRequestException('Failed to decrypt connector password');
        //     }
        // } else {
        //     // Mask password for API responses
        //     password = '***ENCRYPTED***';
        // }

        // entity.parameters.password = password;

        console.log('retrieved password: ', entity.parameters.password)

        const dto: ViewConnectorSpecificationDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            connectorType: entity.connectorType,
            endPointType: entity.endPointType,
            hostName: entity.hostName,
            timeout: entity.timeout,
            maximumRetries: entity.maximumRetries,
            cronSchedule: entity.cronSchedule,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment,
        };
        return dto;
    }

}

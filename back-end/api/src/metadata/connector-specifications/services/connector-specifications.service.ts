import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorSpecificationEntity } from '../entities/connector-specifications.entity';
import { ConnectorSpecificationBindingEntity } from '../entities/connector-specification-binding.entity';
import { ConnectorParameters, ConnectorTypeEnum, CreateConnectorSpecificationDto, ExportFileServerSpecificationDto, ImportFileServerParametersDto, ImportFileServerSpecificationDto, ServerTypeEnum, StoredConnectorParameters } from '../dtos/create-connector-specification.dto';
import { ViewConnectorSpecificationModel } from '../dtos/view-connector-specification.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionUtils } from 'src/shared/utils/encryption.utils';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';
import { normaliseExcludePatterns, parseExcludePatterns, parseFilePattern } from '../utils/connector-file-pattern.util';

@Injectable()
export class ConnectorSpecificationsService implements OnModuleInit {
    private readonly logger = new Logger(ConnectorSpecificationsService.name);
    private readonly cache: MetadataCache<ViewConnectorSpecificationModel>;

    constructor(
        @InjectRepository(ConnectorSpecificationEntity)
        private connectorRepo: Repository<ConnectorSpecificationEntity>,
        @InjectRepository(ConnectorSpecificationBindingEntity)
        private bindingRepo: Repository<ConnectorSpecificationBindingEntity>,
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

        // Every connector's bindings in one query rather than one per connector.
        // The whole table is bounded by connectors x bindings, which is
        // configuration-sized, and this runs only on a cache refresh.
        const allBindings: ConnectorSpecificationBindingEntity[] = await this.loadBindings();
        const byConnector = new Map<number, ConnectorSpecificationBindingEntity[]>();
        for (const binding of allBindings) {
            const bucket = byConnector.get(binding.connectorSpecificationId);
            if (bucket) {
                bucket.push(binding);
            } else {
                byConnector.set(binding.connectorSpecificationId, [binding]);
            }
        }

        // Cache stores records with encrypted (not masked) passwords
        const records: ViewConnectorSpecificationModel[] = entities.map(
            entity => this.createViewDtoFromEntity(entity, byConnector.get(entity.id) ?? []),
        );
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    /**
     * All binding rows, tolerating the table not being there yet.
     *
     * On an upgraded installation `synchronize` is off, so
     * `connector_specification_bindings` is created by `MigrationsService` —
     * and migrations run from the ROOT module's `onModuleInit`, which Nest
     * invokes after every feature module's. This cache is therefore primed once
     * before the table exists, on exactly one boot in the lifetime of an
     * installation. Letting that throw takes the whole API down with
     * `relation "connector_specification_bindings" does not exist` and no way
     * forward, since the migration that would fix it never gets to run.
     *
     * So that one case degrades to "no bindings yet" instead. It is not
     * papering over a missing table in general: the migration re-primes this
     * cache as its last act, so by the time anything can read a connector the
     * bindings are really there. Only `undefined_table` is swallowed — any other
     * failure still propagates, because a connector silently serialising with
     * no bindings is exactly the state that would make the next save delete
     * them all.
     */
    private async loadBindings(): Promise<ConnectorSpecificationBindingEntity[]> {
        try {
            return await this.bindingRepo.find({
                order: { connectorSpecificationId: 'ASC', sortOrder: 'ASC', id: 'ASC' },
            });
        } catch (error) {
            const code: string | undefined = (error as { driverError?: { code?: string } })?.driverError?.code;
            if (code !== '42P01') {
                throw error;
            }
            this.logger.warn(
                'connector_specification_bindings does not exist yet; treating every connector as unbound until migrations create it.',
            );
            return [];
        }
    }

    /**
     * Re-read the cache from the database. Called by `MigrationsService` once it
     * has created and filled the bindings table, because this cache was primed
     * before either had happened — see `loadBindings`.
     */
    public async refreshCache(): Promise<void> {
        await this.cache.invalidate();
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

        // After the save: bindings need the connector's generated id.
        const bindings: ConnectorSpecificationBindingEntity[] = await this.syncBindings(entity.id, dto);

        await this.cache.invalidate();

        const viewDto = this.createViewDtoFromEntity(entity, bindings);

        this.eventEmitter.emit('connector.created', { id: entity.id, viewDto });

        return viewDto;
    }

    public async update(id: number, dto: CreateConnectorSpecificationDto, userId: number): Promise<ViewConnectorSpecificationModel> {
        const entity: ConnectorSpecificationEntity = await this.findEntity(id);

        // `connectorType` is immutable after creation: the parameter shape
        // (import vs export), cron semantics, and the connector_run_files ledger
        // (which stores `direction` per row) all assume it never changes. A flip
        // would silently reinterpret the connector's entire run-file history.
        if (dto.connectorType !== entity.connectorType) {
            throw new BadRequestException(
                `Connector type cannot be changed after creation (currently "${entity.connectorType}"). Create a new connector instead.`,
            );
        }

        // Snapshotted before anything is replaced. Consumers need the old value
        // to tell an edit that changes what a run means (a re-pointed pattern, a
        // different source spec or station, a binding removed) from one that
        // does not (a renamed connector, a new cron). See the import processor's
        // `connector.updated` handler.
        //
        // Hydrated with the bindings as they stand NOW, before `syncBindings`
        // rewrites them, so the handler compares like with like — the event's
        // `viewDto.parameters.specifications` is the new list.
        const previousBindings: ConnectorSpecificationBindingEntity[] = await this.findBindings(id);
        const previousParameters: ConnectorParameters = JSON.parse(JSON.stringify(
            this.joinBindings(entity.parameters, previousBindings),
        ));

        // Only encrypt if password has changed or not already encrypted or not masked
        if (dto.parameters.password === '***ENCRYPTED***' || EncryptionUtils.isEncrypted(dto.parameters.password)) {
            dto.parameters.password = entity.parameters.password; // Keep existing encrypted password
        } else {
            dto.parameters.password = await EncryptionUtils.encrypt(dto.parameters.password);
        }

        this.updateEntityFromDto(entity, dto, userId);

        await this.connectorRepo.save(entity);

        const bindings: ConnectorSpecificationBindingEntity[] = await this.syncBindings(id, dto);

        await this.cache.invalidate();

        const viewDto: ViewConnectorSpecificationModel = this.createViewDtoFromEntity(entity, bindings);

        this.eventEmitter.emit('connector.updated', { id, viewDto, previousParameters });

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
            return this.createViewDtoFromEntity(entity, await this.findBindings(id));
        }

        entity.disabled = disabled;
        entity.entryUserId = userId;

        await this.connectorRepo.save(entity);
        await this.cache.invalidate();

        // Untouched by this endpoint, but the view DTO is the connector's whole
        // shape and callers read the bindings off it.
        const viewDto: ViewConnectorSpecificationModel = this.createViewDtoFromEntity(entity, await this.findBindings(id));

        this.eventEmitter.emit('connector.disabledChanged', { id, viewDto });

        return viewDto;
    }

    /**
     * Reject an import file-server spec whose `filePattern` or
     * `excludePatterns` don't parse. The grammar is only otherwise checked at
     * connector-run time (deep in the import processor), where a typo silently
     * imports nothing — catch it here at authoring time instead. See
     * connector-file-pattern.util.ts.
     */
    private validateImportFilePatterns(dto: CreateConnectorSpecificationDto): void {
        if (dto.connectorType !== ConnectorTypeEnum.IMPORT || dto.serverType !== ServerTypeEnum.FILE_SERVER) {
            return;
        }
        const specs = (dto.parameters as ImportFileServerParametersDto).specifications ?? [];
        for (const spec of specs) {
            try {
                parseFilePattern(spec.filePattern);
                parseExcludePatterns(spec.excludePatterns);
            } catch (err) {
                throw new BadRequestException(err instanceof Error ? err.message : String(err));
            }
        }
    }

    /**
     * Reject two bindings that are identical in every respect.
     *
     * Binding the same specification to the same station twice over DIFFERENT
     * patterns is legitimate and is the reason bindings have ids at all — a
     * live directory and an archive directory cannot be expressed as one
     * pattern, because directory segments are literal and the grammar has no
     * brace expansion. Binding it twice over the SAME pattern is never
     * meaningful: the two rows match the same files, each gets its own run-file
     * rows under its own binding id, and every matched file is imported twice.
     */
    private validateNoDuplicateBindings(dto: CreateConnectorSpecificationDto): void {
        const seen = new Set<string>();
        for (const spec of this.specificationsOf(dto)) {
            const filePattern: string = (spec as ImportFileServerSpecificationDto).filePattern ?? '';
            const key = `${spec.specificationId}|${spec.stationId ?? ''}|${filePattern}`;
            if (seen.has(key)) {
                throw new BadRequestException(
                    `Duplicate binding: specification ${spec.specificationId}` +
                    `${spec.stationId ? ` for station ${spec.stationId}` : ''}` +
                    `${filePattern ? ` with pattern "${filePattern}"` : ''} is listed more than once. ` +
                    `The same specification and station may be bound more than once, but each binding needs its own file pattern.`,
                );
            }
            seen.add(key);
        }
    }

    /** The bindings list the client sent, whatever the connector's direction. */
    private specificationsOf(
        dto: CreateConnectorSpecificationDto,
    ): (ImportFileServerSpecificationDto | ExportFileServerSpecificationDto)[] {
        return (dto.parameters as ImportFileServerParametersDto).specifications ?? [];
    }

    private updateEntityFromDto(entity: ConnectorSpecificationEntity, dto: CreateConnectorSpecificationDto, userId: number): void {
        this.validateImportFilePatterns(dto);
        this.validateNoDuplicateBindings(dto);

        entity.name = dto.name;
        entity.description = dto.description;
        entity.connectorType = dto.connectorType;
        entity.serverType = dto.serverType;
        entity.hostName = dto.hostName;
        entity.timeout = dto.timeout;
        entity.retryAttempts = dto.retryAttempts;
        // The bindings list is split off here and stored as rows — see
        // `syncBindings`. Leaving it in the JSONB as well would be two sources
        // of truth for the same thing, and the stale copy would be the one the
        // run tiers could not see.
        entity.parameters = this.splitBindings(dto.parameters);
        entity.cronSchedule = dto.cronSchedule;
        entity.disabled = dto.disabled;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
    }

    /** `parameters` minus the bindings list — what the column actually stores. */
    private splitBindings(parameters: ConnectorParameters): StoredConnectorParameters {
        const { specifications: _discarded, ...rest } = parameters as ImportFileServerParametersDto;
        return rest as StoredConnectorParameters;
    }

    /** `parameters` with the bindings list put back — what the API returns. */
    private joinBindings(
        parameters: StoredConnectorParameters,
        bindings: ConnectorSpecificationBindingEntity[],
    ): ConnectorParameters {
        return {
            ...parameters,
            specifications: bindings.map(binding => ({
                id: binding.id,
                disabled: binding.disabled,
                specificationId: binding.specificationId,
                stationId: binding.stationId,
                // Export bindings have no pattern. The field stays off the
                // object rather than being sent as null, so an export DTO still
                // validates under `forbidNonWhitelisted`.
                ...(binding.filePattern === null ? {} : {
                    filePattern: binding.filePattern,
                    excludePatterns: binding.excludePatterns ?? [],
                }),
            })),
        } as ConnectorParameters;
    }

    private async findBindings(connectorId: number): Promise<ConnectorSpecificationBindingEntity[]> {
        return this.bindingRepo.find({
            where: { connectorSpecificationId: connectorId },
            order: { sortOrder: 'ASC', id: 'ASC' },
        });
    }

    /**
     * Make the binding rows match the list the client submitted, PRESERVING THE
     * IDENTITY of every binding that survived the edit.
     *
     * That preservation is the whole point of the table. A binding carries an
     * id; `connector_run_specs` and `connector_run_files` key on it; and the
     * de-duplication ledger is the file rows. So:
     *
     *  - a submitted binding with a known id is UPDATED in place. Re-pointing
     *    its pattern or its station keeps its history and its ledger, and the
     *    next run re-lists under the new mapping without re-importing files it
     *    has already read.
     *  - a submitted binding with no id is INSERTED and gets a fresh one.
     *  - a binding the client did not send back is DELETED. Its run rows stay —
     *    they hold `binding_id` as a plain integer, no foreign key — so finished
     *    runs keep showing what they did. Re-adding an equivalent binding
     *    afterwards therefore yields a NEW id and one re-import, which is the
     *    intended reading of "a new binding tallies afresh".
     *
     * An id the client sends that does not belong to this connector is treated
     * as absent rather than trusted, so a stale or hand-edited payload cannot
     * re-home another connector's binding.
     */
    private async syncBindings(
        connectorId: number,
        dto: CreateConnectorSpecificationDto,
    ): Promise<ConnectorSpecificationBindingEntity[]> {
        const submitted = this.specificationsOf(dto);
        const existing: ConnectorSpecificationBindingEntity[] = await this.findBindings(connectorId);
        const existingById = new Map<number, ConnectorSpecificationBindingEntity>(existing.map(b => [b.id, b]));

        const kept = new Set<number>();
        const toSave: ConnectorSpecificationBindingEntity[] = [];

        submitted.forEach((spec, index) => {
            const filePattern: string | null = (spec as ImportFileServerSpecificationDto).filePattern ?? null;
            // Stored normalised, so the run tiers and the fingerprint never see
            // the blanks a stray comma in the form leaves behind.
            const excludePatterns: string[] = normaliseExcludePatterns((spec as ImportFileServerSpecificationDto).excludePatterns);
            const current = spec.id ? existingById.get(spec.id) : undefined;

            if (current) {
                kept.add(current.id);
                current.specificationId = spec.specificationId;
                current.stationId = spec.stationId;
                current.filePattern = filePattern;
                current.excludePatterns = excludePatterns;
                current.disabled = spec.disabled ?? false;
                current.sortOrder = index;
                toSave.push(current);
                return;
            }

            toSave.push(this.bindingRepo.create({
                connectorSpecificationId: connectorId,
                specificationId: spec.specificationId,
                stationId: spec.stationId,
                filePattern,
                excludePatterns,
                disabled: spec.disabled ?? false,
                sortOrder: index,
            }));
        });

        const removed: ConnectorSpecificationBindingEntity[] = existing.filter(b => !kept.has(b.id));
        if (removed.length > 0) {
            await this.bindingRepo.remove(removed);
        }
        if (toSave.length > 0) {
            await this.bindingRepo.save(toSave);
        }

        return this.findBindings(connectorId);
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

    /**
     * Creates a view DTO from entity. Stores encrypted (not masked) password.
     *
     * `bindings` is passed in rather than read here so that every caller is
     * forced to decide where they come from — a bulk read for the cache, or the
     * rows a save just wrote. A connector whose bindings were quietly omitted
     * would serialise as one with none, which the UI would show as an empty
     * form and the next save would then make true.
     */
    private createViewDtoFromEntity(
        entity: ConnectorSpecificationEntity,
        bindings: ConnectorSpecificationBindingEntity[],
    ): ViewConnectorSpecificationModel {
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
            parameters: this.joinBindings(entity.parameters, bindings),
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

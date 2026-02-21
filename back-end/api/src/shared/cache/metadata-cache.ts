import { Logger } from '@nestjs/common';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';

export interface CacheLoadResult<TViewDto> {
    records: TViewDto[];
    lastModifiedDate: Date | null;
}

/**
 * Generic in-memory cache for metadata entities.
 *
 * Eagerly loaded at startup via OnModuleInit, then kept warm by
 * invalidating (reloading from DB) after any mutation.
 *
 * All read operations are served from memory — zero database queries.
 * checkUpdates() compares count and lastModifiedDate from the cache.
 */
export class MetadataCache<TViewDto> {
    private records: TViewDto[] = [];
    private recordsById = new Map<string | number, TViewDto>();
    private lastModifiedDate: Date | null = null;
    private loading: Promise<void> | null = null;
    private readonly logger: Logger;

    constructor(
        name: string,
        private readonly loadFn: () => Promise<CacheLoadResult<TViewDto>>,
        private readonly getIdFn: (record: TViewDto) => string | number,
    ) {
        this.logger = new Logger(`MetadataCache:${name}`);
    }

    /** Loads the cache from the database. Call during OnModuleInit. */
    public async init(): Promise<void> {
        await this.refresh();
    }

    /** Reloads all records from the database. Deduplicates concurrent calls. */
    private async refresh(): Promise<void> {
        if (this.loading) {
            return this.loading;
        }

        this.loading = this.doRefresh().finally(() => {
            this.loading = null;
        });

        return this.loading;
    }

    private async doRefresh(): Promise<void> {
        try {
            const result = await this.loadFn();
            this.records = result.records;
            this.recordsById = new Map(result.records.map(r => [this.getIdFn(r), r]));
            this.lastModifiedDate = result.lastModifiedDate;
            this.logger.log(`Refreshed: ${result.records.length} records`);
        } catch (error) {
            this.logger.error(`Failed to refresh`, error);
            throw error;
        }
    }

    /** Invalidates and reloads the cache. Call after any mutation. */
    async invalidate(): Promise<void> {
        await this.refresh();
    }

    /** Returns all cached records. */
    getAll(): TViewDto[] {
        return this.records;
    }

    /** Returns a single record by ID, or undefined if not found. */
    getById(id: string | number): TViewDto | undefined {
        return this.recordsById.get(id);
    }

    /** Returns the total number of cached records. */
    getCount(): number {
        return this.records.length;
    }

    /** Returns the last modified date across all cached records. */
    getLastModifiedDate(): Date | null {
        return this.lastModifiedDate;
    }

    /**
     * Checks if the client's cached data is up to date.
     * Fully served from in-memory cache — no database queries.
     */
    checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        const serverCount = this.getCount();
        let changesDetected = false;

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            changesDetected = true;
        } else if (updatesQueryDto.lastModifiedDate && this.lastModifiedDate) {
            changesDetected = this.lastModifiedDate > new Date(updatesQueryDto.lastModifiedDate);
        }

        if (changesDetected) {
            return { metadataChanged: true, metadataRecords: this.getAll() };
        }

        return { metadataChanged: false };
    }
}

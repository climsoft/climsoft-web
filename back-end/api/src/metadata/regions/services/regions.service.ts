import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FileIOService } from 'src/shared/services/file-io.service';
import { RegionTypeEnum } from '../enums/region-types.enum';
import { ViewRegionDto } from '../dtos/view-region.dto';
import { ViewRegionQueryDTO } from '../dtos/view-region-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { RegionEntity } from '../entities/region.entity';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class RegionsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewRegionDto>;

    constructor(
        @InjectRepository(RegionEntity) private regionsRepo: Repository<RegionEntity>,
        private fileUploadService: FileIOService
    ) {
        this.cache = new MetadataCache<ViewRegionDto>(
            'Regions',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewRegionDto>> {
        const entities = await this.regionsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewRegionDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): ViewRegionDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return dto;
    }

    public find(viewRegionQueryDto?: ViewRegionQueryDTO): ViewRegionDto[] {
        let results = this.cache.getAll();

        if (viewRegionQueryDto) {
            if (viewRegionQueryDto.regionIds) {
                const idSet = new Set(viewRegionQueryDto.regionIds);
                results = results.filter(dto => idSet.has(dto.id));
            }

            if (viewRegionQueryDto.regionType) {
                results = results.filter(dto => dto.regionType === viewRegionQueryDto.regionType);
            }

            // Apply pagination
            if (viewRegionQueryDto.page && viewRegionQueryDto.page > 0 && viewRegionQueryDto.pageSize) {
                const skip = (viewRegionQueryDto.page - 1) * viewRegionQueryDto.pageSize;
                results = results.slice(skip, skip + viewRegionQueryDto.pageSize);
            }
        }

        return results;
    }

    public count(viewRegionQueryDto: ViewRegionQueryDTO): number {
        let results = this.cache.getAll();

        if (viewRegionQueryDto.regionIds) {
            const idSet = new Set(viewRegionQueryDto.regionIds);
            results = results.filter(dto => idSet.has(dto.id));
        }

        if (viewRegionQueryDto.regionType) {
            results = results.filter(dto => dto.regionType === viewRegionQueryDto.regionType);
        }

        return results.length;
    }

    public async extractAndsaveRegions(regionType: RegionTypeEnum, file: Express.Multer.File, userId: number) {
        const filePathName: string = `${this.fileUploadService.apiImportsDir}/user_${userId}_regions_upload_${new Date().getTime()}.json`;

        // Save the file to the temporary directory
        await this.fileUploadService.saveFile(file, filePathName);

        const geoJsonData = JSON.parse(await this.fileUploadService.readFile(filePathName));

        const features = geoJsonData.features;

        const regionsToSave: RegionEntity[] = [];
        for (const region of features) {

            const name: string = region.properties.NAME_1;

            let entity = await this.regionsRepo.findOneBy({
                name: name,
            });

            if (!entity) {
                entity = await this.regionsRepo.create();
            }

            entity.name = name; // Assuming the name is in properties
            entity.description = null;
            entity.regionType = regionType; // Replace with appropriate region type
            entity.boundary = region.geometry;
            entity.entryUserId = userId;

            regionsToSave.push(entity);
        }

        await this.regionsRepo.save(regionsToSave);
        await this.cache.invalidate();

        this.fileUploadService.deleteFile(filePathName);
    }

    public async delete(id: number): Promise<number> {
        const entity = await this.regionsRepo.findOneBy({ id: id });
        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        await this.regionsRepo.remove(entity);
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: RegionEntity[] = await this.regionsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.regionsRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    private createViewRegionDto(entity: RegionEntity): ViewRegionDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            regionType: entity.regionType,
            boundary: entity.boundary.coordinates
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}

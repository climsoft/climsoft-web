import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RegionEntity } from '../../stations/entities/region.entity';
import { FileIOService } from 'src/shared/services/file-io.service';
import { RegionTypeEnum } from '../enums/region-types.enum';
import { ViewRegionDto } from '../dtos/view-region.dto';
import { ViewRegionQueryDTO } from '../dtos/view-region-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';

@Injectable()
export class RegionsService {

    constructor(
        @InjectRepository(RegionEntity) private regionsRepo: Repository<RegionEntity>,
        private fileUploadService: FileIOService
    ) { }

    private async findEntity(id: number): Promise<RegionEntity> {
        const entity = await this.regionsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }

    public async findOne(id: number): Promise<ViewRegionDto> {
        const entity = await this.findEntity(id);
        return this.createViewRegionDto(entity);
    }

    public async find(viewRegionQueryDto?: ViewRegionQueryDTO): Promise<ViewRegionDto[]> {
        const findOptions: FindManyOptions<RegionEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (viewRegionQueryDto) {
            findOptions.where = this.getFilter(viewRegionQueryDto);
            // If page and page size provided, skip and limit accordingly
            if (viewRegionQueryDto.page && viewRegionQueryDto.page > 0 && viewRegionQueryDto.pageSize) {
                findOptions.skip = (viewRegionQueryDto.page - 1) * viewRegionQueryDto.pageSize;
                findOptions.take = viewRegionQueryDto.pageSize;
            }
        }

        return (await this.regionsRepo.find(findOptions)).map(entity => {
            return this.createViewRegionDto(entity);
        });
    }

    public async count(viewRegionQueryDto: ViewRegionQueryDTO): Promise<number> {
        return this.regionsRepo.countBy(this.getFilter(viewRegionQueryDto));
    }

    private getFilter(viewRegionQueryDto: ViewRegionQueryDTO): FindOptionsWhere<RegionEntity> {
        const whereOptions: FindOptionsWhere<RegionEntity> = {};

        if (viewRegionQueryDto.regionIds) {
            whereOptions.id = viewRegionQueryDto.regionIds.length === 1 ? viewRegionQueryDto.regionIds[0] : In(viewRegionQueryDto.regionIds);
        }

        if (viewRegionQueryDto.regionType) {
            whereOptions.regionType = viewRegionQueryDto.regionType;
        }

        return whereOptions
    }

    public async extractAndsaveRegions(regionType: RegionTypeEnum, file: Express.Multer.File, userId: number) {
        const filePathName: string = `${this.fileUploadService.tempFilesFolderPath}/user_${userId}_regions_upload_${new Date().getTime()}.json`;

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

        this.fileUploadService.deleteFile(filePathName);
    }

    public async delete(id: number): Promise<number> {
        await this.regionsRepo.remove(await this.findEntity(id));
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: RegionEntity[] = await this.regionsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.regionsRepo.remove(entities);
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

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.regionsRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<RegionEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.regionsRepo.count({ where: whereOptions })) > 0
        }

        if (changesDetected) {
            // If any changes detected then return all records 
            const allRecords = await this.find();
            return { metadataChanged: true, metadataRecords: allRecords }
        } else {
            // If no changes detected then indicate no metadata changed
            return { metadataChanged: false }
        }
    }

}

import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RegionEntity } from '../entities/region.entity';
import { FileUploadService } from 'src/shared/services/file-upload.service';
import { RegionTypeEnum } from '../enums/region-types.enum';

// TODO refactor this service later

@Injectable()
export class RegionsService {

    constructor(
        private fileUploadService: FileUploadService,
        @InjectRepository(RegionEntity) private readonly regionsRepo: Repository<RegionEntity>
    ) { }


    public async find(id: number): Promise<RegionEntity> {
        const entity = await this.regionsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }


    public async findAll(selectOptions?: FindOptionsWhere<RegionEntity>): Promise<RegionEntity[]> {
        const findOptions: FindManyOptions<RegionEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        return this.regionsRepo.find(findOptions);
    }



    public async extractAndsaveRegions(regionType: RegionTypeEnum,file: Express.Multer.File, userId: number): Promise<RegionEntity[]> {
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
            entity.description = ''; 
            entity.regionType = regionType; // Replace with appropriate region type
            entity.boundary = region.geometry;
            entity.entryUserId = userId;
            
            regionsToSave.push(entity);
        }

        

        this.fileUploadService.deleteFile(filePathName);

        return await this.regionsRepo.save(regionsToSave);
    }


    public async delete(id: number): Promise<number> {
        const regionEntity = await this.find(id);
        await this.regionsRepo.remove(regionEntity);
        return id;
    }

}

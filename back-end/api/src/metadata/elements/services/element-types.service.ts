import { FindManyOptions, FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto"; 
import { ElementTypeEntity } from "../entities/element-type.entity";
import { ViewElementTypeDto } from "../dtos/elements/view-element-type.dto";

@Injectable()
export class ElementTypesService {

    public constructor(
        @InjectRepository(ElementTypeEntity) private elementTypeRepo: Repository<ElementTypeEntity>) {
    }

    public async find(): Promise<ViewElementTypeDto[]> {
        const findOptions: FindManyOptions<ElementTypeEntity> = {
            order: { id: "ASC" }
        };

        return (await this.elementTypeRepo.find(findOptions)).map(item=>{
            return {id: item.id, name: item.name, description: item.description, subdomainId: item.subdomainId}
        });
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.elementTypeRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<ElementTypeEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.elementTypeRepo.count({ where: whereOptions })) > 0
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
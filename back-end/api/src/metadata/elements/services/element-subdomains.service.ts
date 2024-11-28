import { FindManyOptions, FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto";
import { ElementSubdomainEntity } from "../entities/element-subdomain.entity";
import { ViewElementSubdomainDto } from "../dtos/elements/view-element-subdomain.dto";

@Injectable()
export class ElementSubdomainsService {

    public constructor(
        @InjectRepository(ElementSubdomainEntity) private elementSubdomainRepo: Repository<ElementSubdomainEntity>) {
    }

    public async find(): Promise<ViewElementSubdomainDto[]> {
        const findOptions: FindManyOptions<ElementSubdomainEntity> = {
            order: { id: "ASC" }
        };

        return (await this.elementSubdomainRepo.find(findOptions)).map(item=>{
            return {id: item.id, name: item.name, description: item.description, domain: item.domain}
        });
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.elementSubdomainRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<ElementSubdomainEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.elementSubdomainRepo.count({ where: whereOptions })) > 0
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
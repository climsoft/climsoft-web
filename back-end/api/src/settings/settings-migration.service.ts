import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralSettingEntity } from './entities/general-setting.entity';
import { Settings1ParamsDto } from './dtos/settings-params/settings-1-params.dto';
import { SettingIds } from './dtos/setting-ids';

@Injectable()
export class SettingsMigrationService {
    constructor(
        @InjectRepository(GeneralSettingEntity) private generalSettingRepo: Repository<GeneralSettingEntity>,) { }


    public async seedSettings() {
        await this.seedGeneralSettings(); 
    }


    private async seedGeneralSettings() {
        // TODO. Later use the element service 
        const count = await this.generalSettingRepo.count();
        if (count === 0) {
            await this.generalSettingRepo.save(this.getGeneralSettings())
        }
      }
      
      private  getGeneralSettings(): GeneralSettingEntity[]{
        const generalSettings: GeneralSettingEntity[] = [];
        generalSettings.push(this.generalSettingRepo.create({
            id: SettingIds.DEFAULT_MAP_VIEW,
            description: 'The default geographical coordinates (longitude, latitude) and zoom level that the map will center on when it is first loaded.',
            parameters: new Settings1ParamsDto().default(),
            entryUserId: 1
        }));
        return generalSettings;
      }

}

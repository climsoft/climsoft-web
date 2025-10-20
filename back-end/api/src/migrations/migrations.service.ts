import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { DatabaseVersionEntity } from './entities/database-version.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ElementSubdomainsService } from 'src/metadata/elements/services/element-subdomains.service';
import { ElementTypesService } from 'src/metadata/elements/services/element-types.service';
import { StationObsEnvService } from 'src/metadata/stations/services/station-obs-env.service';
import { StationObsFocusesService } from 'src/metadata/stations/services/station-obs-focuses.service';
import { MetadataDefaults } from './metadata-defaults';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { GeneralSettingsDefaults } from './general-settings-defaults';
import { SqlScriptsLoaderService } from 'src/sql-scripts/sql-scripts-loader.service';

@Injectable()
export class MigrationsService {
  private readonly SUPPORTED_DB_VERSION: string = "0.0.3"; // TODO. Should come from a versioning file. 
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectRepository(DatabaseVersionEntity) private dbVersionRepo: Repository<DatabaseVersionEntity>,
    private sqlScriptsService: SqlScriptsLoaderService,
    private userService: UsersService,
    private elementSubdomainsService: ElementSubdomainsService,
    private elementTypesService: ElementTypesService,
    private stationObsEnvService: StationObsEnvService,
    private stationObsFocusesService: StationObsFocusesService,
    private generalSettingsService: GeneralSettingsService) { }

  public async doMigrations() {
    // Get last db version
    const [lastDBVersion] = await this.dbVersionRepo.find({
      order: { id: 'DESC' },
      take: 1, // Limit to one record
    });

    if (lastDBVersion) {
      if (lastDBVersion.version === this.SUPPORTED_DB_VERSION) {
        // DB version same so return.
        return;
      } else if (!this.isVersionGreater(this.SUPPORTED_DB_VERSION, lastDBVersion.version)) {
        const errorMessage = `Database version ${lastDBVersion.version} is greater than the supported version ${this.SUPPORTED_DB_VERSION}.`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

    }

    // Depending on the version the seeding will be different
    await this.seedDatabase();

    // After successful migrations, then add the new database version
    const newDBVersion = this.dbVersionRepo.create({
      version: this.SUPPORTED_DB_VERSION,
      entryUserId: 1,
    });
    await this.dbVersionRepo.save(newDBVersion);

  }

  private isVersionGreater(currentVersion: string, lastVersion: string): boolean {
    const currentParts = currentVersion.split('.').map(Number);
    const lastParts = lastVersion.split('.').map(Number);

    for (let i = 0; i < currentParts.length; i++) {
      if (currentParts[i] > lastParts[i]) {
        return true;
      } else if (currentParts[i] < lastParts[i]) {
        return false;
      }
    }

    return false;  // If all parts are equal
  }

  private async seedDatabase() {
    await this.seedTriggers();
    await this.seedFirstUser();
    await this.seedMetadata();
    await this.seedGeneralSettings();
  }

  private async seedTriggers() {
    await this.sqlScriptsService.addEntryDatetimeTriggerToDB();
    await this.sqlScriptsService.addLogsTriggersToDB();
    await this.sqlScriptsService.addQCTestsFunctionsToDB();
     await this.sqlScriptsService.addDataAvailabilityFunctionsToDB();
  }

  private async seedFirstUser() {
    const count = await this.userService.count();
    if (count === 0) {
      const newUser = await this.userService.create(
        {
          name: "admin",
          email: "admin@climsoft.org",
          phone: null,
          isSystemAdmin: true,
          permissions: null,
          groupId: null,
          extraMetadata: null,
          disabled: false,
          comment: null,
        }
      );

      await this.userService.changeUserPassword({ userId: newUser.id, password: "climsoft@admin!2" });
      this.logger.log(`User ${newUser.name} added`);
    }
  }

  private async seedMetadata() {
    let count: number;
    // Elements metadata
    count = await this.elementSubdomainsService.count();
    if (count === 0) {
      await this.elementSubdomainsService.bulkPut(MetadataDefaults.ELEMENT_SUBDOMAINS, 1);
      this.logger.log('element subdomains added');
    }

    count = await this.elementTypesService.count();
    if (count === 0) {
      await this.elementTypesService.bulkPut(MetadataDefaults.ELEMENT_TYPES, 1);
      this.logger.log('element types added');
    }

    // Stations metadata 
    count = await this.stationObsEnvService.count();
    if (count === 0) {
      await this.stationObsEnvService.bulkPut(MetadataDefaults.STATION_ENVIRONMENTS, 1);
      this.logger.log('station observations environments added');
    }

    count = await this.stationObsFocusesService.count();
    if (count === 0) {
      await this.stationObsFocusesService.bulkPut(MetadataDefaults.STATION_FOCUS, 1);
      this.logger.log('station observations focuses added');
    }

  }

  private async seedGeneralSettings() {
    // Default general settings
    const count: number = await this.generalSettingsService.count();
    if (count === 0) {
      await this.generalSettingsService.bulkPut(GeneralSettingsDefaults.GENERAL_SETTINGS, 1);
      this.logger.log('general settings added');
    }
  }

}

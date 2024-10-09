import { Injectable, Logger } from '@nestjs/common';
import { MetadataMigrationService } from 'src/metadata/metadata-migration.service';
import { SettingsMigrationService } from 'src/settings/settings-migration.service';
import { UserRoleEnum } from 'src/user/enums/user-roles.enum';
import { UsersService } from 'src/user/services/users.service';
import { DatabaseVersionEntity } from './entities/database-version.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MigrationsService {

  private readonly SUPPORTED_DB_VERSION: string = "0.0.1";
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectRepository(DatabaseVersionEntity) private readonly dbVersionRepo: Repository<DatabaseVersionEntity>,
    private readonly userService: UsersService,
    private readonly migrationMetadataService: MetadataMigrationService,
    private readonly migrationSettingsService: SettingsMigrationService) { }

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
        // TODO. Throw error that will stop execution of NestJS application
        //process.exit(1)
      }

    }

    // TODO. depending on the version the seeding will be different
    this.seedDatabase();

    //After successful migrations, then add the new database version
    const newDBVersion = this.dbVersionRepo.create({
      version: this.SUPPORTED_DB_VERSION
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
    // Call the seed methods
    await this.seedFirstUser();
    await this.migrationMetadataService.seedMetadata();
    await this.migrationSettingsService.seedSettings();
  }

  private async seedFirstUser() {
    const count = await this.userService.count();
    if (count === 0) {
      const newUser = await this.userService.createUser(
        {
          name: "admin",
          email: "admin@climsoft.org",
          phone: '',
          role: UserRoleEnum.ADMINISTRATOR,
          authorisedStationIds: null,
          canDownloadData: false,
          authorisedElementIds: null,
          extraMetadata: null,
          disabled: false
        }
      );

      await this.userService.changeUserPassword({ userId: newUser.id, password: "climsoft@admin!2" })
    }
  }




}

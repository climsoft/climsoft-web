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
import { DEFAULT_GENERAL_SETTINGS } from './general-settings-defaults';
import { SqlScriptsLoaderService } from 'src/sql-scripts/sql-scripts-loader.service';
import { QCSpecificationsService } from 'src/metadata/qc-specifications/services/qc-specifications.service';
import { QCTestTypeEnum } from 'src/metadata/qc-specifications/entities/qc-test-type.enum';
import { RangeThresholdQCTestParamsDto } from 'src/metadata/qc-specifications/dtos/qc-test-parameters/range-qc-test-params.dto';
import { GeneralSettingParameters } from 'src/settings/dtos/update-general-setting-params.dto';
import { ViewGeneralSettingModel } from 'src/settings/dtos/view-general-setting.model';
import { FlagsService } from 'src/metadata/flags/services/flags.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationsService {
  private readonly SUPPORTED_DB_VERSION: string = '0.0.4'; // TODO. Should come from a versioning file.
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectRepository(DatabaseVersionEntity) private dbVersionRepo: Repository<DatabaseVersionEntity>,
    private dataSource: DataSource,
    private sqlScriptsService: SqlScriptsLoaderService,
    private userService: UsersService,
    private elementSubdomainsService: ElementSubdomainsService,
    private elementTypesService: ElementTypesService,
    private stationObsEnvService: StationObsEnvService,
    private stationObsFocusesService: StationObsFocusesService,
    private generalSettingsService: GeneralSettingsService,
    private flagsService: FlagsService,
    private elementsService: ElementsService,
    private qcSpecsService: QCSpecificationsService, // TODO. Temporary. After all met services have version preview 2.0.5. Remove this. New installations won't need it

  ) { }

  public async doMigrations() {
    // Get last db version
    const [lastDBVersion] = await this.dbVersionRepo.find({
      order: { id: 'DESC' },
      take: 1, // Limit to one record
    });

    if (lastDBVersion) {
      if (lastDBVersion.version === this.SUPPORTED_DB_VERSION) {
        // DB version same so return.
        this.logger.log('DB version is the same. So no migration');
        return;
      } else if (!this.isVersionGreater(this.SUPPORTED_DB_VERSION, lastDBVersion.version)) {
        const errorMessage = `Database version ${lastDBVersion.version} is greater than the supported version ${this.SUPPORTED_DB_VERSION}.`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

    }

    const startTime: number = Date.now();

    this.logger.log('Starting DB migration');

    // Depending on the version the seeding will be different
    await this.seedDatabase();

    // Migrate observation flag column to flag_id
    await this.migrateObservationFlagsToFlagId();

    // TODO. Temporary solution for preview 1 to 2.0.3 installations. Once all met services have preview 2.0.5 remove this
    await this.changeUpperAndLowerLimitQCStructure();

    // After successful migrations, then add the new database version
    const newDBVersion = this.dbVersionRepo.create({
      version: this.SUPPORTED_DB_VERSION,
      entryUserId: 1,
    });
    await this.dbVersionRepo.save(newDBVersion);

    this.logger.log(`Ending DB migration. Time taken: ${Date.now() - startTime} `);
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
    const count: number = this.userService.count();
    if (count === 0) {
      const newUser = await this.userService.create(
        {
          name: 'admin',
          email: 'admin@climsoft.org',
          phone: null,
          isSystemAdmin: true,
          permissions: null,
          groupId: null,
          extraMetadata: null,
          disabled: false,
          comment: null,
        }
      );

      await this.userService.changeUserPassword({ userId: newUser.id, password: '123' });
      this.logger.log(`User ${newUser.name} added`);
    }
  }

  private async seedMetadata() {
    let count: number;
    // Elements metadata
    count = this.elementSubdomainsService.count();
    if (count === 0) {
      await this.elementSubdomainsService.bulkPut(MetadataDefaults.ELEMENT_SUBDOMAINS, 1);
      this.logger.log('element subdomains added');
    }

    count = this.elementTypesService.count();
    if (count === 0) {
      await this.elementTypesService.bulkPut(MetadataDefaults.ELEMENT_TYPES, 1);
      this.logger.log('element types added');
    }

    // Stations metadata 
    count = this.stationObsEnvService.count();
    if (count === 0) {
      await this.stationObsEnvService.bulkPut(MetadataDefaults.STATION_ENVIRONMENTS, 1);
      this.logger.log('station observations environments added');
    }

    count = this.stationObsFocusesService.count();
    if (count === 0) {
      await this.stationObsFocusesService.bulkPut(MetadataDefaults.STATION_FOCUS, 1);
      this.logger.log('station observations focuses added');
    }

    // Flags metadata
    count = this.flagsService.count();
    if (count === 0) {
      await this.flagsService.bulkPut(MetadataDefaults.FLAGS, 1);
      this.logger.log('flags added');
    }

  }

  private async seedGeneralSettings() {
    const existingSettings = this.generalSettingsService.findAll();

    for (const defaultSetting of DEFAULT_GENERAL_SETTINGS) {
      //If any of the default settings do not exist in the server then add it. This is to make sure that new default settings added in the code will be added to existing installations after migration.
      const existingSetting = existingSettings.find(s => s.id === defaultSetting.id);
      const params: GeneralSettingParameters = existingSetting ? existingSetting.parameters : defaultSetting.parameters;
      await this.generalSettingsService.put(defaultSetting.id, defaultSetting.name, defaultSetting.description, params, 1);
    }


    this.logger.log(`All general settings updated`);
  }

  /**
   * Migrate existing observation flag enum values to flag_id integers.
   * Adds flag_id column if missing, copies data from flag → flag_id, then drops flag column and enum type.
   */
  private async migrateObservationFlagsToFlagId(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // Check if old 'flag_id' column still exists
      const flagIdColumnExists = await queryRunner.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'observations' AND column_name = 'flag_id'
      `);

      if (flagIdColumnExists.length > 0) {
        this.logger.log('Flag id already exists so flags already migrated');
        return; // Already migrated
      }

      this.logger.log('Migrating observation flag enum to flag_id...');

      // Copy data from flag enum to flag_id using abbreviation mapping
      await queryRunner.query(`
        UPDATE observations SET flag_id = f.id
        FROM flags f
        WHERE observations.flag IS NOT NULL
        AND observations.flag_id IS NULL
        AND f.abbreviation = CASE observations.flag::text
          WHEN 'missing' THEN 'M'
          WHEN 'estimate' THEN 'E'
          WHEN 'dubious' THEN 'D'
          WHEN 'generated' THEN 'G'
          WHEN 'cumulative' THEN 'C'
          WHEN 'trace' THEN 'T'
          WHEN 'obscured' THEN 'O'
          WHEN 'variable' THEN 'V'
        END
      `);

      // TODO. Drop the old flag column. No need as subsequent preview release should do this automatically
      //await queryRunner.query(`ALTER TABLE observations DROP COLUMN IF EXISTS flag`);

      // TODO. Drop the old enum type. Investigate if this is needed or if TypeORM will automaticall drop it
      //await queryRunner.query(`DROP TYPE IF EXISTS observations_flag_enum`);

      this.logger.log('Observation flag migration completed');
    } catch (error) {
      this.logger.error('Error migrating observation flags', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

   // TODO. Temporary function to upgrade preview 2.0.4 and below releases
  private async changeUpperAndLowerLimitQCStructure() {
    const rangeQcs = this.qcSpecsService.findQCTestByType(QCTestTypeEnum.RANGE_THRESHOLD);

    for (const qc of rangeQcs) {
      const oldThresholdParams: any = qc.parameters;
      if (oldThresholdParams.lowerThreshold !== undefined && oldThresholdParams.upperThreshold !== undefined) {
        const newThresholdParams: RangeThresholdQCTestParamsDto = {
          allRangeThreshold: {
            lowerThreshold: oldThresholdParams.lowerThreshold,
            upperThreshold: oldThresholdParams.upperThreshold
          }
        };

        await this.qcSpecsService.update(qc.id, { ...qc, parameters: newThresholdParams }, 1);

        this.logger.log(`Range threshold updated -  ${qc.id} - ${qc.name}`)
      }
    }
  }

}

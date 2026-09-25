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
import { FlagsService } from 'src/metadata/flags/services/flags.service';
import { DataSource } from 'typeorm';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { FormSourceDTO } from 'src/metadata/source-specifications/dtos/form-source.dto';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';

@Injectable()
export class MigrationsService {
  private readonly SUPPORTED_DB_VERSION: string = '0.0.9'; // TODO. Should come from a versioning file.
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
    private qcSpecsService: QCSpecificationsService, // TODO. Temporary. After all met services have version preview 2.0.5. Remove this. New installations won't need it
    private sourcesService: SourceSpecificationsService,
    private connectorSpecificationsService: ConnectorSpecificationsService,

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

    // TODO. Temporary solution for preview 1 to 2.0.3 installations. 
    // Once all met services have preview 2.0.5 and above remove this
    await this.changeUpperAndLowerLimitQCStructure();

    // TODO. Temporary solution for preview 1 to 3.0.1 installations. Once all met services have preview 3.0.1 remove this
    // Migrate FORM source parameters from flat elementIds[] to per-element elementsMetadata[]
    await this.migrateFormElementIdsToElementsMetadata();

    // TODO. Temporary solution for preview 1 to 3.0.4 installations. 
    // Once all met services have preview 2.0.5 and above remove this
    // Move a connector's specification-to-station bindings out of its
    // `parameters` JSONB and into their own table, then re-key the run tiers on
    // the binding ids this gives them.
    await this.migrateConnectorBindingsToTable();

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
      // A brand new setting is inserted as-is. An existing one is reconciled
      // against the code default rather than kept verbatim: the default is the
      // authoritative shape, and the stored value only supplies the numbers the
      // user may have tuned. This is what lets a newly added nested key (e.g.
      // connectorLogCleanup) reach existing installs, and a removed one (e.g. a
      // legacy connectorLogCleanup.daysOld from before it became keepLast) drop
      // out — the frontend echoes the whole parameters object back on save, and
      // the global `forbidNonWhitelisted` pipe rejects any key the DTO no longer
      // declares.
      //
      // Shape only, never values: a tuned fileCleanup.daysOld stays as the user
      // set it even when the default changes. Rolling a default value forward is
      // a deliberate migration step, not a side effect of reseeding.
      const existingSetting = existingSettings.find(s => s.id === defaultSetting.id);
      const params: GeneralSettingParameters = existingSetting
        ? this.reconcileSettingShape(defaultSetting.parameters, existingSetting.parameters)
        : defaultSetting.parameters;
      await this.generalSettingsService.put(defaultSetting.id, defaultSetting.name, defaultSetting.description, params, 1);
    }


    this.logger.log(`All general settings updated`);
  }

  /**
   * Overlay a stored setting onto the code default, keeping only keys the
   * default still declares. Recurses one level into nested objects, which is as
   * deep as any general setting goes (the scheduler setting is
   * `section -> { cronSchedule, daysOld | keepLast }`; the others are flat).
   *
   * - key in default and stored, both plain objects  -> merge one level deeper
   * - key in default (object) but stored is not       -> take the default (the
   *                                                     stored value is malformed)
   * - key in default and stored, both scalars         -> take the stored value
   * - key in default only                             -> take the default (a
   *                                                     newly introduced key)
   * - key in stored only                             -> dropped (removed key)
   */
  private reconcileSettingShape(defaults: GeneralSettingParameters, stored: GeneralSettingParameters): GeneralSettingParameters {
    return this.reconcileShape(defaults, stored) as GeneralSettingParameters;
  }

  private reconcileShape(defaults: unknown, stored: unknown): unknown {
    const isPlainObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v);

    if (!isPlainObject(defaults) || !isPlainObject(stored)) {
      return defaults;
    }

    const result: Record<string, unknown> = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!(key in stored)) {
        result[key] = defaultValue;
        continue;
      }
      const storedValue = stored[key];
      if (isPlainObject(defaultValue)) {
        // A structured section: recurse when the stored value is also an object,
        // otherwise discard the malformed stored value for the default shape.
        result[key] = isPlainObject(storedValue)
          ? this.reconcileShape(defaultValue, storedValue)
          : defaultValue;
      } else {
        // A scalar the user may have tuned — keep whatever is stored.
        result[key] = storedValue;
      }
    }
    return result;
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


  /**
   * Move each connector's specification-to-station bindings out of
   * `connector_specifications.parameters -> 'specifications'` and into
   * `connector_specification_bindings`
   */
  private async migrateConnectorBindingsToTable(): Promise<void> {
    try {

      // -- 1. Flatten the JSONB array into rows ---------------------------
      // `WITH ORDINALITY` preserves the order the sysadmin arranged in the form.
      // The NOT EXISTS guard makes a re-run a no-op rather than a second copy;
      // it is per connector, so a connector added after a partial run is still
      // picked up.
      const inserted = await this.dataSource.query(
        `INSERT INTO connector_specification_bindings
             (connector_specification_id, specification_id, station_id, file_pattern, sort_order)
         SELECT c.id,
                (spec.value ->> 'specificationId')::int,
                -- '' and null both mean "no station bound" in the old blob.
                NULLIF(spec.value ->> 'stationId', ''),
                spec.value ->> 'filePattern',
                spec.ord - 1
         FROM connector_specifications c
         CROSS JOIN LATERAL jsonb_array_elements(c.parameters -> 'specifications')
                    WITH ORDINALITY AS spec(value, ord)
         WHERE jsonb_typeof(c.parameters -> 'specifications') = 'array'
           AND (spec.value ->> 'specificationId') IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM connector_specification_bindings b
               WHERE b.connector_specification_id = c.id
           )
         RETURNING id`,
      );
      const bindingsMoved: number = Array.isArray(inserted) ? inserted.length : 0;

      // -- 2. Drop the now-duplicated list from the blob -------------------
      // Only after the rows are safely in. Leaving it would be two sources of
      // truth for the same thing, and the stale copy would be the one the run
      // tiers cannot see.
      await this.dataSource.query(
        `UPDATE connector_specifications
         SET parameters = parameters - 'specifications'
         WHERE parameters ? 'specifications'`,
      );

      // The connector cache was primed before any of the above existed —
      // migrations run from the root module's `onModuleInit`, which Nest invokes
      // after every feature module's — so it is holding connectors with no
      // bindings. Re-read it now that they are real. Without this the scheduler
      // would run the connectors unbound for the rest of the process's life.
      await this.connectorSpecificationsService.refreshCache();

      if (bindingsMoved > 0) {
        this.logger.log(`Moved ${bindingsMoved} connector binding(s) from parameters JSONB into connector_specification_bindings`);
      } else {
        this.logger.log('No connector bindings to move into connector_specification_bindings');
      }
    } catch (error) {
      this.logger.error('Error migrating connector bindings to their own table', error);
      throw error;
    }
  }

  /**
  * Migrate FORM source parameters from `elementIds: number[]` to
  * `elementsMetadata: { elementId, hours }[]`. Each existing element id is
  * carried over with `hours: null` so behavior is preserved (every element
  * enabled at every form hour). Idempotent — rows that already have
  * `elementsMetadata` are skipped.
  */
  private async migrateFormElementIdsToElementsMetadata(): Promise<void> {
    try {
      const sources = this.sourcesService.findAll();

      const updates: { id: number; parameters: FormSourceDTO }[] = [];
      for (const source of sources) {
        if (source.sourceType !== SourceTypeEnum.FORM) continue;
        const params = source.parameters as FormSourceDTO & { elementIds?: number[] };
        if (params.elementsMetadata) continue;        // already migrated
        if (!Array.isArray(params.elementIds)) continue;

        const { elementIds, ...rest } = params;
        const newParams: FormSourceDTO = {
          ...rest,
          elementsMetadata: elementIds.map(id => ({ elementId: id, hours: null })),
        };

        updates.push({ id: source.id, parameters: newParams });
      }

      const migrated = await this.sourcesService.bulkUpdateParameters(updates, 1);

      if (migrated > 0) {
        this.logger.log(`Migrated ${migrated} FORM source(s) from elementIds to elementsMetadata`);
      } else {
        this.logger.log('No FORM sources needed elementIds → elementsMetadata migration');
      }
    } catch (error) {
      this.logger.error('Error migrating FORM elementIds to elementsMetadata', error);
      throw error;
    }
  }

}

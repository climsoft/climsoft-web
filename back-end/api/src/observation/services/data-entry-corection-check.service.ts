import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewSourceSpecificationModel } from 'src/metadata/source-specifications/dtos/view-source-specification.model';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { FormSourceDTO } from 'src/metadata/source-specifications/dtos/form-source.dto';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ObservationPeriodPermissionsDto } from 'src/user/dtos/permissions/user-permission.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';

// TODO. Later convert this service to a guard ??

interface FormSpecs {
    form: FormSourceDTO;
    /** Element id -> set of UTC-adjusted hours allowed for that element on this form. */
    allowedHoursByElement: Map<number, Set<number>>;
}

interface EntryFormValidation {
    sourceType: SourceTypeEnum;
    sourceSpec: FormSpecs | ImportSourceDto;
}

interface ValidationErrorMessage {
    message: string,
    dto?: CreateObservationDto | DeleteObservationDto;
}

@Injectable()
export class DataEntryAndCorrectionCheckService implements OnModuleInit {
    private readonly logger = new Logger(DataEntryAndCorrectionCheckService.name);
    private sourceParameters: Map<number, EntryFormValidation> = new Map();

    constructor(private sourceService: SourceSpecificationsService,) {
    }

    async onModuleInit(): Promise<void> {
        await this.reloadFormParameters();
    }

    @OnEvent('source.created')
    handleSourceCreated(payload: { id: number; dto: any }) {
        this.logger.log(`Source created: ID ${payload.id}`);
        this.reloadFormParameters();
    }

    @OnEvent('source.updated')
    handleSourceUpdated(payload: { id: number; dto: any }) {
        this.logger.log(`Source updated: ID ${payload.id}`);
        this.reloadFormParameters();
    }

    @OnEvent('source.bulk-updated')
    handleSourcesBulkUpdated(payload: { ids: number[] }) {
        this.logger.log(`Sources bulk-updated: ${payload.ids.length} record(s)`);
        this.reloadFormParameters();
    }

    @OnEvent('source.deleted')
    handleSourceDeleted(payload: { id: number }) {
        this.logger.log(`Source deleted: ID ${payload.id}`);
        this.reloadFormParameters();
    }

    private async reloadFormParameters() {
        this.sourceParameters.clear();
        const sources: ViewSourceSpecificationModel[] = this.sourceService.findAll();
        for (const source of sources) {
            if (source.sourceType === SourceTypeEnum.FORM) {
                const form = source.parameters as FormSourceDTO;
                // data sent from the form is converted to utc based on the form utc setting,
                // so the form's stored hours may be in local time and need to be shifted to UTC for comparison.
                const toUtc = (hour: number): number => source.utcOffset === 0
                    ? hour
                    : DateUtils.getHourBasedOnUTCOffset(hour, source.utcOffset, 'subtract');

                // Build per-element allowed UTC hour sets. `hours: null` means inherit the form's hours.
                const allowedHoursByElement = new Map<number, Set<number>>();
                if (form.elementsMetadata) { // TODO. After all users have preview 3.0.1 this check can be removed.
                    for (const elementMeta of form.elementsMetadata) {
                        const sourceHours = elementMeta.hours ?? form.hours;
                        allowedHoursByElement.set(elementMeta.elementId, new Set(sourceHours.map(toUtc)));
                    }
                }

                this.sourceParameters.set(source.id, {
                    sourceType: SourceTypeEnum.FORM,
                    sourceSpec: {
                        form: form, allowedHoursByElement: allowedHoursByElement
                    }
                });
            } else if (source.sourceType === SourceTypeEnum.IMPORT) {
                this.sourceParameters.set(source.id, {
                    sourceType: SourceTypeEnum.IMPORT,
                    sourceSpec: source.parameters as ImportSourceDto
                });
            } else {
                throw new Error('Developer error: Source type not recognised')
            }
        }
        this.logger.log('Form sources for data entry checking reloaded');
    }

    public async checkData(observationDtos: CreateObservationDto[] | DeleteObservationDto[], user: LoggedInUserDto, operation: 'data-entry' | 'data-deletion'): Promise<void> {
        const startTime = Date.now();

        let errorMessage: ValidationErrorMessage;
        this.logger.log(`checking ${observationDtos.length} observations from user: ${user.id} - ${user.name} - ${user.email}`);
        // Validate all observations entered
        const todayDate: Date = new Date();
        for (const dto of observationDtos) {

            //-------------------------------------------------------------------------------
            // First check for all data edits
            //-------------------------------------------------------------------------------
            // If user is  system admin then do not check for data entry permissions
            if (!user.isSystemAdmin) {
                if (!user.permissions) {
                    throw new BadRequestException('All permissions not found');
                }

                const entryPermissions = user.permissions.entryPermissions;
                let errorMessage: ValidationErrorMessage;

                if (!entryPermissions) {
                    errorMessage = { message: 'Entry permissions not found', dto: dto };
                    this.logger.error(JSON.stringify(errorMessage));
                    throw new BadRequestException(errorMessage);
                }

                if (entryPermissions.stationIds) {
                    if (!entryPermissions.stationIds.includes(dto.stationId)) {
                        errorMessage = { message: 'Station of the observation is not in the list of stations you are allowed to enter/correct/delete data for', dto: dto };
                        this.logger.error(JSON.stringify(errorMessage));
                        throw new BadRequestException(errorMessage);
                    }
                }

                if (entryPermissions.observationPeriod) {
                    const observationPeriod: ObservationPeriodPermissionsDto | undefined = entryPermissions.observationPeriod;
                    if (observationPeriod) {
                        if (observationPeriod.within) {

                            if (new Date(dto.datetime) < new Date(observationPeriod.within.fromDate)) {
                                errorMessage = { message: 'Date of the observation is outside what you are allowed to enter/correct/delete data for', dto: dto };
                                this.logger.error(JSON.stringify(errorMessage));
                                throw new BadRequestException(errorMessage);
                            }

                            if (new Date(dto.datetime) > new Date(observationPeriod.within.toDate)) {
                                errorMessage = { message: 'Date of the observation is outside what you are allowed to enter/correct/delete data for', dto: dto };
                                this.logger.error(JSON.stringify(errorMessage));
                                throw new BadRequestException(errorMessage);
                            }

                        } else if (observationPeriod.fromDate) {
                            if (new Date(dto.datetime) < new Date(observationPeriod.fromDate)) {
                                errorMessage = { message: 'Date of the observation is outside what you are allowed to enter/correct/delete data for', dto: dto };
                                this.logger.error(JSON.stringify(errorMessage));
                                throw new BadRequestException(errorMessage);
                            }
                        } else if (observationPeriod.last) {
                            const now = new Date();
                            const earliestAllowedDate = new Date();
                            earliestAllowedDate.setMinutes(now.getMinutes() - observationPeriod.last);

                            if (new Date(dto.datetime) < earliestAllowedDate) {
                                errorMessage = { message: `Date of the observation is outside what you are allowed to enter/correct/delete data for.`, dto: dto };
                                this.logger.error(JSON.stringify(errorMessage));
                                throw new BadRequestException(errorMessage);
                            }
                        }
                    }
                }
            }
            //-------------------------------------------------------------------------------


            // If its a deletion operation, no need to check for source validations
            if (operation === 'data-deletion') continue;

            //-------------------------------------------------------------------------------
            // Check for source paramters 
            //-------------------------------------------------------------------------------
            const source = this.sourceParameters.get(dto.sourceId);

            if (!source) {
                errorMessage = { message: 'Source template not found', dto: dto };
                this.logger.error(JSON.stringify(errorMessage));
                throw new BadRequestException(errorMessage);
            }

            if (source.sourceType === SourceTypeEnum.FORM) {
                const formSpec: FormSpecs = source.sourceSpec as FormSpecs;
                const allowedHours = formSpec.allowedHoursByElement.get(dto.elementId);

                // check element
                if (!allowedHours) {
                    errorMessage = { message: 'Element not allowed', dto: dto };
                    this.logger.error(JSON.stringify(errorMessage));
                    throw new BadRequestException(errorMessage);
                }

                // Check if the hour is allowed for this element on this form
                const obsHour = parseInt(dto.datetime.substring(11, 13), 10);
                if (!allowedHours.has(obsHour)) {
                    errorMessage = { message: 'Element not allowed at this hour', dto: dto };
                    this.logger.error(JSON.stringify(errorMessage));
                    throw new BadRequestException(errorMessage);
                }

            } else if (source.sourceType === SourceTypeEnum.IMPORT) {
                // Do nothing.
            }
            //-------------------------------------------------------------------------------


            //-------------------------------------------------------------------------------
            // Check for future dates      
            //-------------------------------------------------------------------------------    
            if (new Date(dto.datetime) > todayDate) {
                errorMessage = { message: 'Future dates not allowed', dto: dto };
                this.logger.error(`${JSON.stringify(errorMessage)} | TodayDate: ${todayDate.toISOString()}`);
                throw new BadRequestException(errorMessage);
            }
            //-------------------------------------------------------------------------------

            //-------------------------------------------------------------------------------
            // Check for valid value and flag
            //-------------------------------------------------------------------------------
            const tempDto = dto as CreateObservationDto
            if (tempDto.value === null && tempDto.flagId === null) {
                errorMessage = { message: 'Both value and flag are missing, not allowed.', dto: dto };
                this.logger.error(JSON.stringify(errorMessage));
                throw new BadRequestException(errorMessage);
            }
            // TODO. In future check for valid flag entry given the associated element
            //-------------------------------------------------------------------------------
        }

        this.logger.log(`observations checks took: ${Date.now() - startTime} milliseconds`);
    }


}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewSourceDto } from 'src/metadata/source-specifications/dtos/view-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { FormSourceDTO } from 'src/metadata/source-specifications/dtos/form-source.dto';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { DateUtils } from 'src/shared/utils/date.utils'; 
import { ObservationPeriodPermissionsDto } from 'src/user/dtos/permissions/user-permission.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';

// TODO. Later convert this service to a guard??

interface FormParams {
    form: FormSourceDTO;
    utcAdjustedHours: number[];
}

interface EntryFormValidation {
    sourceType: SourceTypeEnum;
    settings: FormParams | ImportSourceDto;
}

interface ValidationErrorMessage {
    message: string,
    dto?: CreateObservationDto | DeleteObservationDto;
}

@Injectable()
export class DataEntryAndCorrectionCheckService {
    private readonly logger = new Logger(DataEntryAndCorrectionCheckService.name);
    private sourceParameters: Map<number, EntryFormValidation> = new Map();

    constructor(
        private sourceService: SourceSpecificationsService,) {
        this.resetFormParameters();
    }

    @OnEvent('source.created')
    handleSourceCreated(payload: { id: number; dto: any }) {
        console.log(`Source created: ID ${payload.id}`);
        this.resetFormParameters();
    }

    @OnEvent('source.updated')
    handleSourceUpdated(payload: { id: number; dto: any }) {
        console.log(`Source updated: ID ${payload.id}`);
        this.resetFormParameters();
    }

    @OnEvent('source.deleted')
    handleSourceDeleted(payload: { id: number }) {
        console.log(`Source deleted: ID ${payload.id}`);
        this.resetFormParameters();
    }

    private async resetFormParameters() {
        this.sourceParameters.clear();
        const sourceTemplates: ViewSourceDto[] = await this.sourceService.findAll();
        for (const source of sourceTemplates) {
            if (source.sourceType === SourceTypeEnum.FORM) {
                const form = source.parameters as FormSourceDTO;
                // If the form utc setting is not 0, then use the utc setting to adjust the hours to utc.
                // data sent from the form is converted to utc based on the form utc setting, so the hours on the form could be in say localtime
                const utcAdjustedHours: number[] = source.utcOffset === 0 ?
                    form.hours : form.hours.map(hour => (DateUtils.getHourBasedOnUTCOffset(hour, source.utcOffset, 'subtract')));
                this.sourceParameters.set(source.id, {
                    sourceType: SourceTypeEnum.FORM,
                    settings: {
                        form: form, utcAdjustedHours: utcAdjustedHours
                    }
                });
            } else if (source.sourceType === SourceTypeEnum.IMPORT) {
                this.sourceParameters.set(source.id, {
                    sourceType: SourceTypeEnum.IMPORT,
                    settings: source.parameters as ImportSourceDto
                });
            } else {
                throw new Error('Developer error: Source type not recognised')
            }
        }
    }

    public async checkData(observationDtos: CreateObservationDto[] | DeleteObservationDto[], user: LoggedInUserDto, operation: 'data-entry' | 'data-deletion'): Promise<void> {
        const startTime = new Date().getTime();
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
                            const duration = observationPeriod.last.duration;
                            const durationType = observationPeriod.last.durationType;

                            if (durationType === 'days') {
                                earliestAllowedDate.setDate(now.getDate() - duration);
                            } else if (durationType === 'hours') {
                                earliestAllowedDate.setHours(now.getHours() - duration);
                            }

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
                const formTemplate: FormParams = source.settings as FormParams;
                // check element
                if (!formTemplate.form.elementIds.includes(dto.elementId)) {
                    errorMessage = { message: 'Element not allowed', dto: dto };
                    this.logger.error(JSON.stringify(errorMessage));
                    throw new BadRequestException(errorMessage);
                }

                // Check if hour is allowed for the form
                if (!formTemplate.utcAdjustedHours.includes(parseInt(dto.datetime.substring(11, 13), 10))) {
                    errorMessage = { message: 'Hour not allowed', dto: dto };
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
            if (tempDto.value === null && tempDto.flag === null) {
                errorMessage = { message: 'Both value and flag are missing, not allowed.', dto: dto };
                this.logger.error(JSON.stringify(errorMessage));
                throw new BadRequestException(errorMessage);
            }
            // TODO. In future check for valid flag entry given the associated element
            //-------------------------------------------------------------------------------
        }

        this.logger.log(`observations checks took: ${new Date().getTime() - startTime} milliseconds`);
    }


}

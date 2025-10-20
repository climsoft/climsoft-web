import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { CreateEntryFormDTO } from 'src/metadata/source-templates/dtos/create-entry-form.dto';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { DateUtils } from 'src/shared/utils/date.utils';
import { CreateImportSourceDTO } from 'src/metadata/source-templates/dtos/create-import-source.dto';

// TODO. Later convert this service to a guard??

interface FormParams {
    form: CreateEntryFormDTO;
    utcAdjustedHours: number[];
}

interface EntryFormValidation {
    sourceType: SourceTypeEnum;
    settings: FormParams | CreateImportSourceDTO;
}

@Injectable()
export class DataEntryCheckService {
    private readonly logger = new Logger(DataEntryCheckService.name);
    private sourceParameters: Map<number, EntryFormValidation> = new Map();

    constructor(
        private sourceService: SourceTemplatesService,) {
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
                const form = source.parameters as CreateEntryFormDTO;
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
                    settings: source.parameters as CreateImportSourceDTO
                });
            } else {
                throw new Error('Developer error: Source type not recognised')
            }
        }
    }

    public async checkData(observationDtos: CreateObservationDto[], user: LoggedInUserDto): Promise<void> {
        const startTime = new Date().getTime();
        let errorMessage: { message: string, dto: CreateObservationDto | number; }
        this.logger.log(`checking ${observationDtos.length} observations from user: ${user.id} - ${user.name} - ${user.email}`);
        // Validate all observations entered
        const todayDate: Date = new Date();
        for (const dto of observationDtos) {
            // If user is not system admin then check for data entry permissions
            if (!user.isSystemAdmin) {
                // For permission issues, don't retur the error message with a dto. 
                // The front end deletes any bad request exception that has a dto
                if (!user.permissions) throw new BadRequestException('Permissions not found');
                if (!user.permissions.entryPermissions) throw new BadRequestException('Entry permissions not found');
                if (user.permissions.entryPermissions.stationIds && user.permissions.entryPermissions.stationIds.length > 0) {
                    if (!user.permissions.entryPermissions.stationIds.includes(dto.stationId)) throw new BadRequestException('Not allowed to enter data for station');
                }
            }

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

                // Check for interval is allowed for the form
                if (!formTemplate.form.allowIntervalEditing) {
                    if (formTemplate.form.interval !== dto.interval) {
                        errorMessage = { message: 'Interval not allowed', dto: dto };
                        this.logger.error(JSON.stringify(errorMessage));
                        throw new BadRequestException(errorMessage);
                    }
                }

            } else if (source.sourceType === SourceTypeEnum.IMPORT) {
                // TODO. Deprecate this check. Import data checking sould be done by DuckDB
            }

            // Check for future dates           
            if (new Date(dto.datetime) > todayDate) {
                // TODO. Follow up on when invalid dates are being bypassed at the front end.  
                errorMessage = { message: 'Future dates not allowed', dto: dto };
                this.logger.error(`${JSON.stringify(errorMessage)} | TodayDate: ${todayDate.toISOString()}`);
                throw new BadRequestException(errorMessage);
            }

            if (dto.value === null && dto.flag === null) {
                errorMessage = { message: 'Both value and flag are missing, not allowed.', dto: dto };
                this.logger.error(JSON.stringify(errorMessage));
                throw new BadRequestException(errorMessage);
            }
        }

        this.logger.log(`observations checks took: ${new Date().getTime() - startTime} milliseconds`);
    }

}

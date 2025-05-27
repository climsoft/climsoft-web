import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { CreateEntryFormDTO } from 'src/metadata/source-templates/dtos/create-entry-form.dto';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { OnEvent } from '@nestjs/event-emitter';

// TODO. Later convert this service to a guard??

@Injectable()
export class FormDataEntryCheckService {
    private readonly logger = new Logger(FormDataEntryCheckService.name);
    private formSources: Map<number, CreateEntryFormDTO> = new Map();

    constructor(
        private sourceService: SourceTemplatesService,) { 
        this.reSetSources();
    }

    @OnEvent('source.created')
    handleSourceCreated(payload: { id: number; dto: any }) {
        console.log(`Source created: ID ${payload.id}`);
        // maybe invalidate cache, trigger sync, etc.
        this.reSetSources();
    }

    @OnEvent('source.updated')
    handleSourceUpdated(payload: { id: number; dto: any }) {
        console.log(`Source updated: ID ${payload.id}`);
        this.reSetSources();
    }

    @OnEvent('source.deleted')
    handleSourceDeleted(payload: { id: number }) {
        console.log(`Source deleted: ID ${payload.id}`);
        this.reSetSources();
    }

    private async reSetSources() {
        this.formSources.clear();
        const sourceTemplates: ViewSourceDto[] = await this.sourceService.findSourcesByType(SourceTypeEnum.FORM);
        for (const source of sourceTemplates) {
            this.formSources.set(source.id, source.parameters as CreateEntryFormDTO)
        }
    }

    public async checkData(observationDtos: CreateObservationDto[], user: LoggedInUserDto): Promise<void> {
        const startTime = new Date().getTime();
        this.logger.log(`checking ${observationDtos.length} observations from user: ${user.id} - ${user.email}`);
        // Validate all observations entered
        for (const dto of observationDtos) {
            // If user is not system admin then check for data entry permissions
            if (!user.isSystemAdmin) {
                if (!user.permissions) throw new BadRequestException('Permissions not found');
                if (!user.permissions.entryPermissions) throw new BadRequestException('Entry permissions not found');
                if (user.permissions.entryPermissions.stationIds && user.permissions.entryPermissions.stationIds.length > 0) {
                    if (!user.permissions.entryPermissions.stationIds.includes(dto.stationId)) throw new BadRequestException('Station not allowed');
                }
            }

            const formTemplate = this.formSources.get(dto.sourceId);

            if (!formTemplate) throw new BadRequestException('Form not found');

            // check element
            if (!formTemplate.elementIds.includes(dto.elementId)) throw new BadRequestException('Interval not allowed');

            // Check if hour is allowed for the form
            if (!formTemplate.hours.includes(parseInt(dto.datetime.substring(11, 13), 10))) throw new BadRequestException('Hour not allowed');

            // Check for interval is allowed for the form
            if (!formTemplate.allowIntervalEditing) {
                if (formTemplate.interval !== dto.interval) throw new BadRequestException('Interval not allowed');
            }


        }

        this.logger.log(`observations checks took: ${new Date().getTime() - startTime} milliseconds`);

    }

}

import { Component } from '@angular/core';
import { ViewJobQueueModel } from '../../models/view-job-queue.model';
import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from '../../models/job-queue-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
    selector: 'app-job-detail-dialog',
    templateUrl: './job-detail-dialog.component.html',
    styleUrls: ['./job-detail-dialog.component.scss']
})
export class JobDetailDialogComponent {
    protected open: boolean = false;
    protected job!: ViewJobQueueModel;
    protected activeTab: 'details' | 'payload' | 'error' = 'details';
    
    constructor(private cachedMetadata: CachedMetadataService ) { }

    public openDialog(job: ViewJobQueueModel): void {
        this.job = job;
        this.activeTab = 'details';
        this.open = true;
    }

    protected getStatusBadgeClass(status: JobQueueStatusEnum): string {
        switch (status) {
            case JobQueueStatusEnum.PENDING:
                return 'bg-warning text-dark';
            case JobQueueStatusEnum.PROCESSING:
                return 'bg-info text-white';
            case JobQueueStatusEnum.FINISHED:
                return 'bg-success';
            case JobQueueStatusEnum.FAILED:
                return 'bg-danger';
            case JobQueueStatusEnum.CANCELLED:
                return 'bg-secondary';
            default:
                return 'bg-light text-dark';
        }
    }

    protected formatStatus(status: JobQueueStatusEnum): string {
        return StringUtils.formatEnumForDisplay(status);
    }

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.cachedMetadata.utcOffSet);
    }

    protected formatPayload(payload: any): string {
        return JSON.stringify(payload, null, 2);
    }

    protected formatJobType(jobType: JobTypeEnum): string {
        switch (jobType) {
            case JobTypeEnum.CONNECTOR_IMPORT:
                return 'Connector Import';
            case JobTypeEnum.CONNECTOR_EXPORT:
                return 'Connector Export';
            default:
                return jobType;
        }
    }

    protected formatTriggeredBy(triggeredBy: JobTriggerEnum): string {
        return StringUtils.formatEnumForDisplay(triggeredBy);
    }

    protected getJobTypeBadgeClass(jobType: JobTypeEnum): string {
        switch (jobType) {
            case JobTypeEnum.CONNECTOR_IMPORT:
                 return 'bg-primary';               
            case JobTypeEnum.CONNECTOR_EXPORT:
                return 'bg-info text-white';
            default:
                return 'bg-light text-dark';
        }
    }

    protected getTriggeredByBadgeClass(triggeredBy: JobTriggerEnum): string {
        switch (triggeredBy) {
            case JobTriggerEnum.SCHEDULE:
                return 'bg-primary';
            case JobTriggerEnum.MANUAL:
                return 'bg-secondary';
            default:
                return 'bg-light text-dark';
        }
    }
}

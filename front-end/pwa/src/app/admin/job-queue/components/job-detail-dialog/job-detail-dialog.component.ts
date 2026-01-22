import { Component } from '@angular/core';
import { ViewJobQueueModel } from '../../models/view-job-queue.model';
import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from '../../models/job-queue-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
    selector: 'app-job-detail-dialog',
    templateUrl: './job-detail-dialog.component.html',
    styleUrls: ['./job-detail-dialog.component.scss']
})
export class JobDetailDialogComponent {
    protected open: boolean = false;
    protected job: ViewJobQueueModel | null = null;
    protected activeTab: 'details' | 'payload' | 'error' = 'details';

    public openDialog(job: ViewJobQueueModel): void {
        this.job = job;
        this.activeTab = 'details';
        this.open = true;
    }

    protected onClose(): void {
        this.open = false;
        this.job = null;
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
        return new Date(dateString).toLocaleString();
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
                return 'bg-info text-white';
            case JobTypeEnum.CONNECTOR_EXPORT:
                return 'bg-primary';
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

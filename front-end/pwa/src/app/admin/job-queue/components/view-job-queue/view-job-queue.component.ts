import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { JobQueueService } from '../../services/job-queue.service';
import { ViewJobQueueModel } from '../../models/view-job-queue.model';
import { JobQueueQueryModel } from '../../models/job-queue-query.model';
import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from '../../models/job-queue-status.enum';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { JobDetailDialogComponent } from '../job-detail-dialog/job-detail-dialog.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';


@Component({
    selector: 'app-view-job-queue',
    templateUrl: './view-job-queue.component.html',
    styleUrls: ['./view-job-queue.component.scss']
})
export class ViewJobQueueComponent implements OnDestroy {
    @ViewChild('jobDetailDialog') jobDetailDialog!: JobDetailDialogComponent;

    protected jobs: ViewJobQueueModel[] = [];
    protected loading: boolean = false;
    protected paging: PagingParameters = new PagingParameters();

    // Filter options
    protected selectedJobStatus!: JobQueueStatusEnum | null;
    protected selectedJobType!: JobTypeEnum | null;
    protected selectedTriggeredBy!: JobTriggerEnum | null;
    protected dateRange: DateRange = {
        fromDate: DateUtils.getDateOnlyAsString(new Date()),
        toDate: DateUtils.getDateOnlyAsString(new Date())
    };


    private destroy$ = new Subject<void>();

    constructor(
        private pagesDataService: PagesDataService,
        private jobQueueService: JobQueueService,
        private cachedMetadataSearchService: CachedMetadataService,
    ) {
        this.pagesDataService.setPageHeader('Job Queue');

        this.cachedMetadataSearchService.allMetadataLoaded.pipe(
            takeUntil(this.destroy$),
        ).subscribe(allMetadataLoaded => {
            if (!allMetadataLoaded) return;
            this.loadJobs();
        });
    }


    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected loadJobs(): void {
        this.loading = true;
        const query: JobQueueQueryModel = {
            page: this.paging.page,
            pageSize: this.paging.pageSize,
        };

        if (this.selectedJobStatus) {
            query.status = this.selectedJobStatus;
        }
        if (this.selectedJobType) {
            query.jobType = this.selectedJobType;
        }
        if (this.selectedTriggeredBy) {
            query.triggeredBy = this.selectedTriggeredBy;
        }

        // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
        // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
        if (this.dateRange.fromDate) {
            query.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.fromDate}T00:00:00.000Z`, this.cachedMetadataSearchService.utcOffSet, 'subtract')
        }
        if (this.dateRange.toDate) {
            query.toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.toDate}T23:59:00.000Z`, this.cachedMetadataSearchService.utcOffSet, 'subtract');
        }

        // First get the count
        this.jobQueueService.count(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (count) => {
                    this.paging.setTotalRowCount(count);
                },
                error: (err) => {
                    this.showError('Failed to get job count', err);
                }
            });

        // Then get the data
        this.jobQueueService.find(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (jobs) => {
                    this.jobs = jobs;
                    this.loading = false;
                },
                error: (err) => {
                    this.loading = false;
                    this.showError('Failed to load jobs', err);
                }
            });
    }

    protected onDateFilterChange(): void {
        this.loadJobs();
    }

    protected onJobTypeFilterChange(option: JobTypeEnum | null): void {
        this.selectedJobType = option;
        this.loadJobs();
    }

    protected onJobStatusFilterChange(option: JobQueueStatusEnum | null): void {
        this.selectedJobStatus = option;
        this.loadJobs();
    }

    protected onTriggeredByFilterChange(option: JobTriggerEnum | null): void {
        this.selectedTriggeredBy = option;
        this.loadJobs();
    }

    protected onPageChange(): void {
        this.loadJobs();
    }

    protected onJobClick(job: ViewJobQueueModel): void {
        this.jobDetailDialog.openDialog(job);
    }

    protected onCancelJob(job: ViewJobQueueModel, event: Event): void {
        event.stopPropagation();
        if (job.status !== JobQueueStatusEnum.PENDING && job.status !== JobQueueStatusEnum.PROCESSING) {
            return;
        }

        this.jobQueueService.cancel(job.id)
            .pipe(take(1))
            .subscribe({
                next: () => {
                    this.pagesDataService.showToast({
                        title: 'Job Queue',
                        message: 'Job cancelled successfully',
                        type: ToastEventTypeEnum.SUCCESS
                    });
                    this.loadJobs();
                },
                error: (err) => {
                    this.showError('Failed to cancel job', err);
                }
            });
    }

    protected onRetryJob(job: ViewJobQueueModel, event: Event): void {
        event.stopPropagation();
        if (job.status !== JobQueueStatusEnum.FAILED) {
            return;
        }

        this.jobQueueService.retry(job.id)
            .pipe(take(1))
            .subscribe({
                next: () => {
                    this.pagesDataService.showToast({
                        title: 'Job Queue',
                        message: 'Job queued for retry',
                        type: ToastEventTypeEnum.SUCCESS
                    });
                    this.loadJobs();
                },
                error: (err) => {
                    this.showError('Failed to retry job', err);
                }
            });
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

    protected formatJobType(jobType: JobTypeEnum): string {
        switch (jobType) {
            case JobTypeEnum.CONNECTOR_IMPORT:
                return 'Import';
            case JobTypeEnum.CONNECTOR_EXPORT:
                return 'Export';
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

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.cachedMetadataSearchService.utcOffSet);
    }

    protected canCancel(job: ViewJobQueueModel): boolean {
        return job.status === JobQueueStatusEnum.PENDING || job.status === JobQueueStatusEnum.PROCESSING;
    }

    protected canRetry(job: ViewJobQueueModel): boolean {
        return job.status === JobQueueStatusEnum.FAILED;
    }

    private showError(title: string, error: any): void {
        this.pagesDataService.showToast({
            title,
            message: error?.message || 'An error occurred',
            type: ToastEventTypeEnum.ERROR
        });
    }
}

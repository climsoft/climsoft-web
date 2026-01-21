import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { JobQueueService } from '../../services/job-queue.service';
import { ViewJobQueueModel } from '../../models/view-job-queue.model';
import { JobQueueQueryModel } from '../../models/job-queue-query.model';
import { JobQueueStatusEnum } from '../../models/job-queue-status.enum';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { JobDetailDialogComponent } from '../job-detail-dialog/job-detail-dialog.component';

@Component({
    selector: 'app-view-job-queue',
    templateUrl: './view-job-queue.component.html',
    styleUrls: ['./view-job-queue.component.scss']
})
export class ViewJobQueueComponent implements OnInit, OnDestroy {
    @ViewChild('jobDetailDialog') jobDetailDialog!: JobDetailDialogComponent;

    protected jobs: ViewJobQueueModel[] = [];
    protected loading: boolean = false;
    protected paging: PagingParameters = new PagingParameters();

    // Filter options
    protected statusOptions: { id: JobQueueStatusEnum | null; name: string }[] = [
        { id: null, name: 'All' },
        { id: JobQueueStatusEnum.PENDING, name: 'Pending' },
        { id: JobQueueStatusEnum.PROCESSING, name: 'Processing' },
        { id: JobQueueStatusEnum.FINISHED, name: 'Finished' },
        { id: JobQueueStatusEnum.FAILED, name: 'Failed' },
        { id: JobQueueStatusEnum.CANCELLED, name: 'Cancelled' },
    ];
    protected selectedStatusOption: { id: JobQueueStatusEnum | null; name: string } | null = this.statusOptions[0];
    protected selectedStatus: JobQueueStatusEnum | null = null;
    protected fromDate: string | null = null;
    protected toDate: string | null = null;

    protected statusDisplayFn = (option: { id: JobQueueStatusEnum | null; name: string }): string => {
        return option.name;
    };

    private destroy$ = new Subject<void>();

    constructor(
        private pagesDataService: PagesDataService,
        private jobQueueService: JobQueueService
    ) {
        this.pagesDataService.setPageHeader('Job Queue');
    }

    ngOnInit(): void {
        this.loadJobs();
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

        if (this.selectedStatus) {
            query.status = this.selectedStatus;
        }
        if (this.fromDate) {
            query.fromDate = this.fromDate;
        }
        if (this.toDate) {
            query.toDate = this.toDate;
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

    protected onFilterChange(): void {
        this.loadJobs();
    }

    protected onStatusFilterChange(option: { id: JobQueueStatusEnum | null; name: string } | null): void {
        this.selectedStatus = option?.id || null;
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
            .pipe(takeUntil(this.destroy$))
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
            .pipe(takeUntil(this.destroy$))
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

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return new Date(dateString).toLocaleString();
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

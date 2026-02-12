import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConnectorExecutionLogService, ConnectorExecutionStats } from '../../services/connector-execution-log.service';
import { ViewConnectorExecutionLogModel } from '../../models/connector-execution-log.model';
import { ConnectorLogQueryModel } from '../../models/connector-log-query.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ConnectorSpecificationsService } from 'src/app/metadata/connector-specifications/services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from 'src/app/metadata/connector-specifications/models/view-connector-specification.model';
import { ExecutionDetailDialogComponent } from '../execution-detail-dialog/execution-detail-dialog.component';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

interface ErrorFilterOption {
    id: boolean | null;
    name: string;
}

@Component({
    selector: 'app-view-connector-logs',
    templateUrl: './view-connector-logs.component.html',
    styleUrls: ['./view-connector-logs.component.scss']
})
export class ViewConnectorLogsComponent implements OnDestroy {
    @ViewChild('executionDetailDialog') executionDetailDialog!: ExecutionDetailDialogComponent;

    protected logs: ViewConnectorExecutionLogModel[] = [];
    protected connectors: ViewConnectorSpecificationModel[] = [];
    protected loading: boolean = false;
    protected paging: PagingParameters = new PagingParameters();
    protected stats: ConnectorExecutionStats | null = null;

    // Connector filter
    protected selectedConnectorId: number | null = null;

    // Date filters
    protected dateRange: DateRange = {
        fromDate: DateUtils.getDateOnlyAsString(new Date()),
        toDate: DateUtils.getDateOnlyAsString(new Date())
    };

    // Error filter
    protected errorFilterOptions: ErrorFilterOption[] = [
        { id: null, name: 'All' },
        { id: true, name: 'With Errors' },
        { id: false, name: 'No Errors' },
    ];
    protected selectedErrorFilterOption: ErrorFilterOption | null = this.errorFilterOptions[0];
    protected hasErrorsFilter: boolean | null = null;

    // Display functions for selectors
    protected errorFilterDisplayFn = (option: ErrorFilterOption): string => option.name;

    private destroy$ = new Subject<void>();

    constructor(
        private pagesDataService: PagesDataService,
        private connectorLogService: ConnectorExecutionLogService,
        private connectorSpecService: ConnectorSpecificationsService,
        private cachedMetadataSearchService: CachedMetadataService,
    ) {
        this.pagesDataService.setPageHeader('Connector Execution Logs');
        this.cachedMetadataSearchService.allMetadataLoaded.pipe(
            takeUntil(this.destroy$),
        ).subscribe(allMetadataLoaded => {
            if (!allMetadataLoaded) return;
            this.loadConnectors();
            this.loadLogs();
        });
    }


    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadConnectors(): void {
        this.connectorSpecService.findAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (connectors) => {
                    this.connectors = connectors;
                },
                error: (err) => {
                    this.showError('Failed to load connectors', err);
                }
            });
    }

    protected loadLogs(): void {
        this.loading = true;
        const query: ConnectorLogQueryModel = {
            page: this.paging.page,
            pageSize: this.paging.pageSize,
        };

        if (this.selectedConnectorId) {
            query.connectorId = this.selectedConnectorId;
        }

         // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
        // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
        if (this.dateRange.fromDate) {
            query.startDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.fromDate}T00:00:00.000Z`, this.cachedMetadataSearchService.utcOffSet, 'subtract')
        }
        if (this.dateRange.toDate) {
            query.endDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.toDate}T23:59:00.000Z`, this.cachedMetadataSearchService.utcOffSet, 'subtract');
        }
        
        if (this.hasErrorsFilter !== null) {
            query.hasErrors = this.hasErrorsFilter;
        }

        // Get count
        this.connectorLogService.count(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (count) => {
                    this.paging.setTotalRowCount(count);
                },
                error: (err) => {
                    this.showError('Failed to get log count', err);
                }
            });

        // Get logs
        this.connectorLogService.find(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (logs) => {
                    this.logs = logs;
                    this.loading = false;
                },
                error: (err) => {
                    this.loading = false;
                    this.showError('Failed to load logs', err);
                }
            });

        // Load stats if a connector is selected
        if (this.selectedConnectorId) {
            this.loadStats();
        } else {
            this.stats = null;
        }
    }

    private loadStats(): void {
        if (!this.selectedConnectorId) {
            return;
        }

        this.connectorLogService.getStats(
            this.selectedConnectorId,
            this.dateRange.fromDate,
            this.dateRange.toDate
        )
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (stats) => {
                    this.stats = stats;
                },
                error: (err) => {
                    this.showError('Failed to load stats', err);
                }
            });
    }

    protected onDateFilterChange(): void {
        this.loadLogs();
    }

    protected onConnectorFilterChange(option: number): void {
        this.selectedConnectorId = option;
        this.loadLogs();
    }

    protected onErrorFilterChange(option: boolean | null): void {
        this.hasErrorsFilter = option;
        this.loadLogs();
    }

    protected onPageChange(): void {
        this.loadLogs();
    }

    protected onLogClick(log: ViewConnectorExecutionLogModel): void {
        const connector = this.connectors.find(c => c.id === log.connectorId);
        if (connector) {
            this.executionDetailDialog.openDialog(log, connector.name, connector.connectorType);
        }
    }

    protected onDeleteLog(log: ViewConnectorExecutionLogModel, event: Event): void {
        event.stopPropagation();
        if (!confirm('Are you sure you want to delete this execution log?')) {
            return;
        }

        this.connectorLogService.delete(log.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.pagesDataService.showToast({
                        title: 'Connector Logs',
                        message: 'Log deleted successfully',
                        type: ToastEventTypeEnum.SUCCESS
                    });
                    this.loadLogs();
                },
                error: (err) => {
                    this.showError('Failed to delete log', err);
                }
            });
    }

    protected getConnectorName(connectorId: number): string {
        const connector = this.connectors.find(c => c.id === connectorId);
        return connector?.name || `Connector #${connectorId}`;
    }

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.cachedMetadataSearchService.utcOffSet);
    }

    protected getDuration(log: ViewConnectorExecutionLogModel): string {
        const start = new Date(log.executionStartDatetime).getTime();
        const end = new Date(log.executionEndDatetime).getTime();
        const durationMs = end - start;

        if (durationMs < 1000) {
            return `${durationMs}ms`;
        } else if (durationMs < 60000) {
            return `${(durationMs / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }

    protected getActivityCount(log: ViewConnectorExecutionLogModel): number {
        return log.executionActivities?.length || 0;
    }

    protected getFileCount(log: ViewConnectorExecutionLogModel): number {
        if (!log.executionActivities) {
            return 0;
        }
        return log.executionActivities.reduce((count, activity) => {
            return count + (activity.processedFiles?.length || 0);
        }, 0);
    }

    protected getSuccessRate(): string {
        if (!this.stats || this.stats.totalExecutions === 0) {
            return '-';
        }
        const rate = (this.stats.successfulExecutions / this.stats.totalExecutions) * 100;
        return `${rate.toFixed(1)}%`;
    }

    private showError(title: string, error: any): void {
        this.pagesDataService.showToast({
            title,
            message: error?.message || 'An error occurred',
            type: ToastEventTypeEnum.ERROR
        });
    }
}

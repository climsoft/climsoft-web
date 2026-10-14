import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConnectorRunService, ConnectorRunStats } from '../../services/connector-run.service';
import { ConnectorRunStatusEnum, ViewConnectorRunModel } from '../../models/connector-run.model';
import { ConnectorRunQueryModel } from '../../models/connector-run-query.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ConnectorSpecificationsService } from 'src/app/metadata/connector-specifications/services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from 'src/app/metadata/connector-specifications/models/view-connector-specification.model';
import { RunDetailDialogComponent } from '../run-detail-dialog/run-detail-dialog.component';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { RunSeverity, runSeverity } from '../../connector-run-thresholds';

interface ErrorFilterOption {
    id: boolean | null;
    name: string;
}

@Component({
    selector: 'app-view-connector-runs',
    templateUrl: './view-connector-runs.component.html',
    styleUrls: ['./view-connector-runs.component.scss']
})
export class ViewConnectorRunsComponent implements OnDestroy {
    @ViewChild('runDetailDialog') runDetailDialog!: RunDetailDialogComponent;

    protected runs: ViewConnectorRunModel[] = [];
    protected connectors: ViewConnectorSpecificationModel[] = [];
    protected loading: boolean = false;
    protected paging: PagingParameters = new PagingParameters();
    protected stats: ConnectorRunStats | null = null;

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
        private connectorRunService: ConnectorRunService,
        private connectorSpecService: ConnectorSpecificationsService,
        private cachedMetadataSearchService: CachedMetadataService,
    ) {
        this.pagesDataService.setPageHeader('Connector Runs');
        this.cachedMetadataSearchService.allMetadataLoaded.pipe(
            takeUntil(this.destroy$),
        ).subscribe(allMetadataLoaded => {
            if (!allMetadataLoaded) return;
            this.loadConnectors();
            this.loadRuns();
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

    /**
     * The filters currently showing, as the API takes them — without paging.
     *
     * Shared by the list, the count and the bulk delete on purpose. "Delete all"
     * means "delete what I am looking at", and the only way to keep that
     * promise is for all three to be built from one place; two copies of this
     * would drift and the delete would quietly stop matching the list.
     */
    private buildQuery(): ConnectorRunQueryModel {
        const query: ConnectorRunQueryModel = {};

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

        return query;
    }

    protected loadRuns(): void {
        this.loading = true;
        const query: ConnectorRunQueryModel = {
            ...this.buildQuery(),
            page: this.paging.page,
            pageSize: this.paging.pageSize,
        };

        // Get count
        this.connectorRunService.count(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (count) => {
                    this.paging.setTotalRowCount(count);
                },
                error: (err) => {
                    this.showError('Failed to get run count', err);
                }
            });

        // Get runs
        this.connectorRunService.find(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (runs) => {
                    this.runs = runs;
                    this.loading = false;
                },
                error: (err) => {
                    this.loading = false;
                    this.showError('Failed to load runs', err);
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

        this.connectorRunService.getStats(
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
        this.loadRuns();
    }

    protected onConnectorFilterChange(option: number): void {
        this.selectedConnectorId = option;
        this.loadRuns();
    }

    protected onErrorFilterChange(option: boolean | null): void {
        this.hasErrorsFilter = option;
        this.loadRuns();
    }

    protected onPageChange(): void {
        this.loadRuns();
    }

    protected onRunClick(run: ViewConnectorRunModel): void {
        const connector = this.connectors.find(c => c.id === run.connectorId);
        if (connector) {
            this.runDetailDialog.openDialog(run, connector.name, connector.connectorType);
        }
    }

    protected onDeleteRun(run: ViewConnectorRunModel, event: Event): void {
        event.stopPropagation();

        // Only the newest run of a connector carries consequences. Its file list
        // is what the next run compares against to decide what has changed, so
        // deleting it makes that connector re-import everything still on the
        // server. Every older run is history and deleting it changes nothing.
        const message = this.isNewestRunForItsConnector(run)
            ? `Delete this execution run?\n\n`
            + `This is the most recent run for this connector, so it also deletes the record of which `
            + `files have already been imported. The next run will re-evaluate every file still present `
            + `on the file server and re-import anything it finds.`
            : 'Delete this execution run? It is a historical run, so this does not affect what the next run imports.';

        if (!confirm(message)) {
            return;
        }

        this.connectorRunService.delete(run.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.pagesDataService.showToast({
                        title: 'Connector Runs',
                        message: 'Log deleted successfully',
                        type: ToastEventTypeEnum.SUCCESS
                    });
                    this.loadRuns();
                },
                error: (err) => {
                    this.showError('Failed to delete run', err);
                }
            });
    }

    /**
     * Whether this row is the most recent run of its connector among the loaded
     * runs. The list is ordered newest first, so the first row for a connector
     * is its newest. If the page is filtered or paged such that an older run
     * appears first, this errs toward the stronger warning, which is the safe
     * direction.
     */
    private isNewestRunForItsConnector(run: ViewConnectorRunModel): boolean {
        const newest = this.runs.find(l => l.connectorId === run.connectorId);
        return !!newest && newest.id === run.id;
    }

    /**
     * Human-readable version of the filters currently applied, for the delete
     * confirmation. Built from the same fields as `buildQuery`, but from the
     * display values rather than the UTC-shifted ones — this is what the user
     * is looking at, and the point is that they recognise it.
     */
    private describeCurrentFilter(): string {
        const parts: string[] = [];

        parts.push(this.selectedConnectorId
            ? `connector "${this.getConnectorName(this.selectedConnectorId)}"`
            : 'all connectors');

        if (this.dateRange.fromDate && this.dateRange.toDate) {
            parts.push(this.dateRange.fromDate === this.dateRange.toDate
                ? `on ${this.dateRange.fromDate}`
                : `from ${this.dateRange.fromDate} to ${this.dateRange.toDate}`);
        } else if (this.dateRange.fromDate) {
            parts.push(`from ${this.dateRange.fromDate}`);
        } else if (this.dateRange.toDate) {
            parts.push(`up to ${this.dateRange.toDate}`);
        }

        if (this.hasErrorsFilter === true) {
            parts.push('with errors');
        } else if (this.hasErrorsFilter === false) {
            parts.push('without errors');
        }

        return parts.join(', ');
    }

    /**
     * Delete every run the current filter matches — not just the page on screen.
     *
     * This also discards the import de-duplication records that cascade from
     * those runs, so the confirmation spells out what happens on the next run.
     * The count comes from the paging total, which the count endpoint filled in
     * using this same filter, so the number quoted is the number that goes.
     */
    protected onDeleteAllRuns(): void {
        const matching = this.paging.totalRowCount;
        if (matching === 0) {
            this.pagesDataService.showToast({
                title: 'Connector Runs',
                message: 'No runs match the current filter.',
                type: ToastEventTypeEnum.INFO
            });
            return;
        }

        const confirmed = confirm(
            `Delete ${matching} connector run(s) — ${this.describeCurrentFilter()}?\n\n`
            + `This deletes every run matching the filter above, not just the page shown.\n\n`
            + `It also deletes the record of which files have already been imported. If the `
            + `most recent run of a connector is in this set, its next run will re-evaluate every `
            + `file still present on the file server and re-import anything it finds.\n\n`
            + `Queued and running runs are left alone — cancel one first if you want it gone.`
        );
        if (!confirmed) {
            return;
        }

        this.connectorRunService.deleteAll(this.buildQuery())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result) => {
                    this.pagesDataService.showToast({
                        title: 'Connector Runs',
                        message: result.skippedActive > 0
                            ? `Deleted ${result.deleted} run(s). Left ${result.skippedActive} queued or running run(s) alone.`
                            : `Deleted ${result.deleted} run(s)`,
                        type: ToastEventTypeEnum.SUCCESS
                    });
                    // Back to the first page: whatever page was being shown is
                    // very likely past the end of what is left.
                    this.paging.setPage(1);
                    this.loadRuns();
                },
                error: (err) => {
                    this.showError('Failed to delete runs', err);
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

    /**
     * The run's own duration, as the API computed it — never recomputed here.
     *
     * This used to derive `end - start` client-side, which was a second source
     * of truth that disagreed with the server and could go negative: an end
     * timestamp written during one attempt against a start timestamp from a
     * later one. The server already measures a running run against now(), so
     * this advances between refreshes without any arithmetic on this side.
     *
     * A queued run has not started, and a running one has not ended — both are
     * normal now that a run exists before it does anything.
     */
    protected getDuration(run: ViewConnectorRunModel): string {
        if (!run.startedAt) {
            return '-';
        }
        return this.formatMs(run.durationMs);
    }

    /**
     * Time spent walking the server's directories. Shown beside the duration
     * because it is part of it — often a third of it on a large file server —
     * and because it is the one figure that grows with the server rather than
     * with the work, which makes it the "archive this directory" signal.
     */
    protected getListingTime(run: ViewConnectorRunModel): string {
        return run.listingMs === null ? '—' : this.formatMs(run.listingMs);
    }

    private formatMs(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }

    protected getSeverity(run: ViewConnectorRunModel): RunSeverity {
        return runSeverity(run);
    }

    /**
     * Failures colour the row first — a broken run is more urgent than a slow
     * one — then the slow-run severity takes over.
     */
    protected getRowClass(run: ViewConnectorRunModel): string {
        if (run.failedCount > 0) {
            return 'table-danger';
        }
        switch (this.getSeverity(run)) {
            case 'red': return 'table-danger';
            case 'amber': return 'table-warning';
            default: return '';
        }
    }

    protected getSlowRunTitle(run: ViewConnectorRunModel): string {
        return `This run spent ${(run.totalScanMs / 1000).toFixed(1)}s matching files and `
            + `${(run.totalProcessMs / 1000).toFixed(1)}s processing them. `
            + `Open the Performance tab to see which specification is responsible.`;
    }

    protected getFileCount(run: ViewConnectorRunModel): number {
        return run.totalFiles || 0;
    }

    protected getSuccessCount(run: ViewConnectorRunModel): number {
        return run.successCount || 0;
    }

    /**
     * Files this run matched but has not settled yet — its outstanding work.
     *
     * Derived rather than fetched: every other outcome is already on the row, so
     * whatever is left of the matched total is still queued. Costs nothing, and
     * avoids a `pending` aggregate that would have to be kept in step with the
     * four it is the complement of.
     */
    protected getQueuedCount(run: ViewConnectorRunModel): number {
        return Math.max(0, run.totalFiles - run.successCount - run.failedCount
            - run.skippedCount - run.emptyCount);
    }

    protected getStatusLabel(run: ViewConnectorRunModel): string {
        switch (run.status) {
            case ConnectorRunStatusEnum.QUEUED: return 'Queued';
            case ConnectorRunStatusEnum.RUNNING: return 'Running';
            case ConnectorRunStatusEnum.FINISHED: return 'Finished';
            case ConnectorRunStatusEnum.FAILED: return 'Failed';
            case ConnectorRunStatusEnum.CANCELLED: return 'Cancelled';
            default: return run.status;
        }
    }

    protected getStatusClass(run: ViewConnectorRunModel): string {
        switch (run.status) {
            case ConnectorRunStatusEnum.QUEUED: return 'bg-secondary';
            case ConnectorRunStatusEnum.RUNNING: return 'bg-primary';
            case ConnectorRunStatusEnum.FINISHED: return 'bg-success';
            case ConnectorRunStatusEnum.FAILED: return 'bg-danger';
            case ConnectorRunStatusEnum.CANCELLED: return 'bg-warning text-dark';
            default: return 'bg-light text-dark border';
        }
    }

    /** Only a run that has not reached a terminal state can be stopped. */
    protected canCancel(run: ViewConnectorRunModel): boolean {
        return run.status === ConnectorRunStatusEnum.QUEUED || run.status === ConnectorRunStatusEnum.RUNNING;
    }

    /**
     * A cancelled run is deliberately not retryable — re-queuing it would put
     * back exactly the work someone just stopped. The next scheduled run picks
     * its leftover files up anyway.
     */
    protected canRetry(run: ViewConnectorRunModel): boolean {
        return run.status === ConnectorRunStatusEnum.FAILED && run.attempts < run.maxAttempts;
    }

    protected onCancelRun(run: ViewConnectorRunModel, event: Event): void {
        event.stopPropagation();
        this.connectorRunService.cancel(run.id).pipe(take(1)).subscribe({
            next: () => {
                this.pagesDataService.showToast({
                    title: 'Connector Run',
                    message: `Run #${run.id} cancelled. Anything not yet ingested stays queued for the next run.`,
                    type: ToastEventTypeEnum.SUCCESS,
                });
                this.loadRuns();
            },
            error: err => this.showError('Cancel Run', err),
        });
    }

    protected onRetryRun(run: ViewConnectorRunModel, event: Event): void {
        event.stopPropagation();
        this.connectorRunService.retry(run.id).pipe(take(1)).subscribe({
            next: () => {
                this.pagesDataService.showToast({
                    title: 'Connector Run',
                    message: `Run #${run.id} queued again. It resumes where it stopped.`,
                    type: ToastEventTypeEnum.SUCCESS,
                });
                this.loadRuns();
            },
            error: err => this.showError('Retry Run', err),
        });
    }

    protected getSuccessRate(): string {
        if (!this.stats || this.stats.totalRuns === 0) {
            return '-';
        }
        const rate = (this.stats.successfulRuns / this.stats.totalRuns) * 100;
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

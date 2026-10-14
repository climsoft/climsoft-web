import { Component } from '@angular/core';
import {
    ConnectorRunStatusEnum,
    ViewConnectorRunModel,
    ConnectorRunFileModel,
    ConnectorRunSpecModel,
    RunFileStatusEnum,
} from '../../models/connector-run.model';
import { ConnectorTypeEnum } from 'src/app/metadata/connector-specifications/models/create-connector-specification.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ConnectorRunService } from '../../services/connector-run.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { RunSeverity, runSeverity } from '../../connector-run-thresholds';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';

@Component({
    selector: 'app-run-detail-dialog',
    templateUrl: './run-detail-dialog.component.html',
    styleUrls: ['./run-detail-dialog.component.scss']
})
export class RunDetailDialogComponent {
    protected open: boolean = false;
    protected run!: ViewConnectorRunModel;
    protected connectorName: string = '';
    protected connectorType!: ConnectorTypeEnum;
    protected activeTab: 'performance' | 'files' = 'performance';

    // Per-file detail is fetched from the ledger, paginated (both directions).
    protected runFiles: ConnectorRunFileModel[] = [];
    protected filesPaging: PagingParameters = new PagingParameters();
    protected loadingFiles: boolean = false;

    // Null means "no filter". An import run lists every file it matched, so on a
    // large file server the unfiltered list is hundreds of thousands of rows and
    // paging through it to find the handful that failed is hopeless. Filtering
    // happens server-side, so picking a status re-queries rather than filtering
    // the page already in hand.
    protected filesStatus: RunFileStatusEnum | null = null;
    protected readonly RunFileStatusEnum = RunFileStatusEnum;

    /**
     * Free-text search over the remote path, in the same `*`-wildcard syntax as
     * a binding's file pattern; text with no `*` matches anywhere in the path.
     * Applied on top of the status buttons, not instead of them — a search
     * while "Failed" is selected searches the failures.
     *
     * Server-side like the status filter, because the snapshot it searches is
     * the whole file server, not the page in hand. There is no index behind it
     * yet, so a run holding hundreds of thousands of files takes a few seconds;
     * that is why it is applied on a button press rather than on every
     * keystroke.
     */
    protected filesSearch: string = '';
    /** Bounds on the file's own modified time, as the file server listed it. */
    protected filesDateRange: DateRange = { fromDate: '', toDate: '' };

    // Per-specification breakdown — bounded by spec count, so no pagination.
    protected runSpecs: ConnectorRunSpecModel[] = [];
    protected loadingSpecs: boolean = false;

    constructor(
        protected cachedMetadata: CachedMetadataService,
        private connectorRunService: ConnectorRunService,
    ) { }

    public openDialog(run: ViewConnectorRunModel, connectorName: string, connectorType: ConnectorTypeEnum): void {
        this.run = run;
        this.connectorName = connectorName;
        this.connectorType = connectorType;
        this.activeTab = 'performance';
        this.runFiles = [];
        this.runSpecs = [];
        this.filesPaging = new PagingParameters();
        this.filesStatus = null;
        this.filesSearch = '';
        this.filesDateRange = { fromDate: '', toDate: '' };
        this.open = true;
        this.loadRunFiles();
        this.loadRunSpecs();
    }

    protected isImportConnector(): boolean {
        return this.connectorType === ConnectorTypeEnum.IMPORT;
    }

    protected loadRunSpecs(): void {
        this.loadingSpecs = true;
        this.connectorRunService.findRunSpecs(this.run.id).subscribe({
            next: (specs) => {
                this.runSpecs = specs;
                this.loadingSpecs = false;
            },
            error: () => {
                this.runSpecs = [];
                this.loadingSpecs = false;
            }
        });
    }

    /**
     * Where the run is in its attempts. `attempts` counts FINISHED executions,
     * so a run in flight is on the one after it — which is why a queued or
     * running run reads +1 and a settled one does not.
     *
     * An attempt is one connection to the file server and one pass over its
     * work: the dispatcher re-queues a failed run a minute later until the
     * attempts are used up. `maxAttempts` is the connector's `retryAttempts`
     * plus the first try.
     */
    protected getAttemptLabel(): string {
        const max: number = this.run.maxAttempts;
        if (this.run.status === ConnectorRunStatusEnum.QUEUED || this.run.status === ConnectorRunStatusEnum.RUNNING) {
            return `Attempt ${Math.min(this.run.attempts + 1, max)} of ${max}`;
        }
        if (this.run.status === ConnectorRunStatusEnum.FAILED && this.isOutOfAttempts()) {
            return `Gave up after ${this.run.attempts} of ${max} attempt(s)`;
        }
        return `Attempt ${this.run.attempts} of ${max}`;
    }

    /** A failed run with nothing left to try needs a sysadmin, not patience. */
    protected isOutOfAttempts(): boolean {
        return this.run.status === ConnectorRunStatusEnum.FAILED && this.run.attempts >= this.run.maxAttempts;
    }

    protected getAttemptTitle(): string {
        const max: number = this.run.maxAttempts;
        if (this.isOutOfAttempts()) {
            return `Every attempt at connecting to the server and working through this run failed. `
                + `Nothing more happens on its own — retry it, or fix the server and wait for the next scheduled run. `
                + `The limit is the connector's retry setting plus the first try.`;
        }
        return `One attempt is one connection to the server and one pass over this run's work. `
            + `A failed attempt is re-queued a minute later, up to ${max} in total `
            + `(the connector's retry setting plus the first try). `
            + `Whatever an attempt already imported stays imported; the next one carries on from there.`;
    }

    protected getStatusLabel(): string {
        switch (this.run?.status) {
            case ConnectorRunStatusEnum.QUEUED: return 'Queued';
            case ConnectorRunStatusEnum.RUNNING: return 'Running';
            case ConnectorRunStatusEnum.FINISHED: return 'Finished';
            case ConnectorRunStatusEnum.FAILED: return 'Failed';
            case ConnectorRunStatusEnum.CANCELLED: return 'Cancelled';
            default: return '-';
        }
    }

    protected getStatusClass(): string {
        switch (this.run?.status) {
            case ConnectorRunStatusEnum.QUEUED: return 'bg-secondary';
            case ConnectorRunStatusEnum.RUNNING: return 'bg-primary';
            case ConnectorRunStatusEnum.FINISHED: return 'bg-success';
            case ConnectorRunStatusEnum.FAILED: return 'bg-danger';
            case ConnectorRunStatusEnum.CANCELLED: return 'bg-warning text-dark';
            default: return 'bg-light text-dark border';
        }
    }

    protected getRunSeverity(): RunSeverity {
        return runSeverity(this.run);
    }

    protected formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    protected loadRunFiles(): void {
        this.loadingFiles = true;
        this.connectorRunService.findRunFiles(
            this.run.id,
            this.filesStatus ?? undefined,
            this.filesPaging.page,
            this.filesPaging.pageSize,
            this.filesSearch.trim() || undefined,
            // The dates are typed in the display time zone; the API compares
            // them against stored UTC. Subtract, the same way the runs list
            // converts its own date filter — this submits, it does not display.
            this.filesDateRange.fromDate
                ? DateUtils.getDatetimesBasedOnUTCOffset(`${this.filesDateRange.fromDate}T00:00:00.000Z`, this.cachedMetadata.utcOffSet, 'subtract')
                : undefined,
            this.filesDateRange.toDate
                ? DateUtils.getDatetimesBasedOnUTCOffset(`${this.filesDateRange.toDate}T23:59:59.999Z`, this.cachedMetadata.utcOffSet, 'subtract')
                : undefined,
        )
            .subscribe({
                next: (page) => {
                    this.runFiles = page.files;
                    this.filesPaging.setTotalRowCount(page.total);
                    this.loadingFiles = false;
                },
                error: () => {
                    this.runFiles = [];
                    this.loadingFiles = false;
                }
            });
    }

    /**
     * Switch the status filter. Always returns to the first page: page 4 of the
     * unfiltered list has no relationship to page 4 of the failures.
     */
    protected onFilesStatusChange(status: RunFileStatusEnum | null): void {
        if (this.filesStatus === status) {
            return;
        }
        this.filesStatus = status;
        this.filesPaging.onFirst();
        this.loadRunFiles();
    }

    /** Run the search. Always returns to the first page — see onFilesStatusChange. */
    protected onFilesSearch(): void {
        this.filesPaging.onFirst();
        this.loadRunFiles();
    }

    protected onFilesSearchClear(): void {
        if (!this.hasFilesSearch()) {
            return;
        }
        this.filesSearch = '';
        this.filesDateRange = { fromDate: '', toDate: '' };
        this.onFilesSearch();
    }

    protected hasFilesSearch(): boolean {
        return this.filesSearch.trim() !== '' || !!this.filesDateRange.fromDate || !!this.filesDateRange.toDate;
    }

    /**
     * Counts for the filter buttons, taken from the run's own aggregates rather
     * than by counting rows, so switching filters costs one query rather than
     * five. `queued` is what discovery matched minus everything the drain has
     * settled or skipped, which is the run's outstanding work.
     */
    /**
     * The status counts come from the run's own totals, which know nothing of a
     * search — so while one is active the badges would contradict the list
     * below them. Hidden rather than recomputed: five more COUNT queries per
     * keystroke-free search is a worse trade than showing the total for the
     * filtered list alone, which the pager already shows.
     */
    protected showStatusCounts(): boolean {
        return !this.hasFilesSearch();
    }

    protected getStatusCount(status: RunFileStatusEnum | null): number {
        switch (status) {
            case RunFileStatusEnum.SUCCESS:
                return this.run.successCount;
            case RunFileStatusEnum.FAILED:
                return this.run.failedCount;
            case RunFileStatusEnum.SKIPPED:
                return this.run.skippedCount;
            case RunFileStatusEnum.EMPTY:
                return this.run.emptyCount;
            case RunFileStatusEnum.EXCLUDED:
                return this.run.excludedCount;
            case RunFileStatusEnum.PENDING:
                return Math.max(0, this.run.totalFiles - this.run.successCount - this.run.failedCount
                    - this.run.skippedCount - this.run.emptyCount);
            default:
                // Excluded files are rows in the ledger but are not matches, so
                // "All" is every file the run acted on plus those it dropped.
                return this.run.totalFiles + this.run.excludedCount;
        }
    }

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.cachedMetadata.utcOffSet);
    }

    protected getDuration(): string {
        return this.formatDuration(this.run.durationMs);
    }
}

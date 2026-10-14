import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ConnectorRunFileModel, RunFileStatusEnum } from '../../models/connector-run.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ConnectorRunService } from '../../services/connector-run.service';

/** Renders one page of connector_run_files rows (import or export). */
@Component({
    selector: 'app-run-files-table',
    templateUrl: './run-files-table.component.html',
    styleUrls: ['./run-files-table.component.scss']
})
export class RunFilesTableComponent implements OnChanges {
    @Input() files: ConnectorRunFileModel[] = [];
    @Input() utcOffset: number = 0;
    /** An export's per-file time is its upload; an import's is download plus processing. */
    @Input() isExport: boolean = false;

    /**
     * Rows whose error is currently shown, keyed the same way the server keys a
     * run file. A Set rather than a single value so several failures can be
     * compared side by side, which is the usual reason for opening one at all.
     */
    private expanded = new Set<string>();

    constructor(private executionLogService: ConnectorRunService) { }

    /**
     * Collapse everything when the page or filter changes. Keys are stable, so
     * without this a row on the new page sharing a key with one opened earlier
     * would arrive already expanded.
     */
    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['files']) {
            this.expanded.clear();
        }
    }

    protected getFileName(file: ConnectorRunFileModel): string {
        return file.remotePath || '(no file — generation failed)';
    }

    protected getFileSize(file: ConnectorRunFileModel): string {
        return file.fileSize === null ? '-' : this.formatFileSize(file.fileSize);
    }

    protected getFileDate(file: ConnectorRunFileModel): string {
        return this.formatDate(file.fileMtime);
    }

    /**
     * Transfer plus local processing, which are sequential, so their sum is the
     * file's cost. Shown as one number to keep the row readable; the split is in
     * the tooltip, because the split is what actually diagnoses a slow run.
     */
    protected getFileTime(file: ConnectorRunFileModel): string {
        if (file.lastTransferMs === null && file.lastProcessMs === null) {
            return '-';
        }
        return this.formatMs((file.lastTransferMs ?? 0) + (file.lastProcessMs ?? 0));
    }

    protected getFileTimeBreakdown(file: ConnectorRunFileModel): string {
        if (file.lastTransferMs === null && file.lastProcessMs === null) {
            return 'Not yet processed';
        }
        const transferLabel: string = this.isExport ? 'Upload' : 'Download';
        const transfer = file.lastTransferMs === null
            ? `${transferLabel} not attempted`
            : `${transferLabel} ${this.formatMs(file.lastTransferMs)}`;
        // An export does no per-file local work, so there is no processing half
        // to report. For an import, a file that failed to download never
        // reached processing at all, which is worth saying rather than showing
        // a bare zero.
        if (this.isExport) {
            return transfer;
        }
        const processing = file.lastProcessMs === null
            ? 'never processed'
            : `processing ${this.formatMs(file.lastProcessMs)}`;
        return `${transfer} · ${processing}`;
    }

    private formatMs(ms: number): string {
        return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
    }

    protected getFileStatus(file: ConnectorRunFileModel): string {
        switch (file.lastStatus) {
            case RunFileStatusEnum.FAILED:
                return 'Failed';
            case RunFileStatusEnum.PENDING:
                return 'Queued';
            case RunFileStatusEnum.SKIPPED:
                return 'Unchanged';
            case RunFileStatusEnum.EMPTY:
                return 'Empty';
            case RunFileStatusEnum.EXCLUDED:
                return 'Excluded';
            default:
                return 'Imported';
        }
    }

    protected getFileStatusClass(file: ConnectorRunFileModel): string {
        switch (file.lastStatus) {
            case RunFileStatusEnum.FAILED:
                return 'bg-danger';
            case RunFileStatusEnum.PENDING:
                return 'bg-secondary';
            case RunFileStatusEnum.SKIPPED:
                return 'bg-light text-dark border';
            // Amber, not red: nothing failed, but it is not a success either and
            // a sysadmin should notice a station producing these.
            case RunFileStatusEnum.EMPTY:
                return 'bg-warning text-dark';
            // Neither good nor bad: an exclusion doing its job.
            case RunFileStatusEnum.EXCLUDED:
                return 'bg-info text-dark';
            default:
                return 'bg-success';
        }
    }

    /**
     * A failed import keeps its downloaded file for inspection. Successes are
     * torn down, and a run that exceeded its retention budget records the
     * failure without keeping the file — so only offer the link when the row
     * actually still points at something.
     */
    protected canDownloadFile(file: ConnectorRunFileModel): boolean {
        return file.lastStatus === RunFileStatusEnum.FAILED && !!file.operationId;
    }

    protected onDownloadFileClick(file: ConnectorRunFileModel): void {
        if (!file.operationId) return;
        // Addressed by the row's own key, not the operation id: the API resolves
        // the directory through the ledger, so an operation id in a URL cannot
        // reach a directory no connector retained.
        window.open(
            this.executionLogService.getRunFileDownloadUrl(
                file.connectorRunId, file.bindingId, file.remotePath,
            ),
            '_blank',
        );
    }

    protected hasFileError(file: ConnectorRunFileModel): boolean {
        return file.lastStatus === RunFileStatusEnum.FAILED;
    }

    /**
     * Whether the row has text to reveal, which is not the same as having
     * failed: an `empty` file carries an explanation of what was found — no data
     * rows, or every value missing — and that is the only place a sysadmin sees
     * it. Expandability follows this; the red row colouring still follows
     * `hasFileError`, because an empty file is not a failure.
     *
     * Only `failed` and `empty` rows ever hold text. A discovered row is
     * inserted with none, and a success settles with none.
     */
    protected hasFileMessage(file: ConnectorRunFileModel): boolean {
        return !!file.lastError;
    }

    /**
     * The row's recorded text. For a transform failure this is two parts: the
     * sentence the API wrote for a sysadmin, then the engine's own message on
     * the next line — kept because the catch-all classification says only that
     * an error occurred, so the original text is all that explains it. The cell
     * is `white-space: pre-wrap`, so the break renders as written.
     */
    protected getFileError(file: ConnectorRunFileModel): string | null {
        return file.lastError;
    }

    /**
     * A run file has no surrogate id — it is keyed by run, binding and remote
     * path — so the expand state is keyed the same way rather than by array
     * index, which would follow the wrong row after paging or filtering.
     */
    private getRowKey(file: ConnectorRunFileModel): string {
        return `${file.bindingId}|${file.remotePath}`;
    }

    protected isExpanded(file: ConnectorRunFileModel): boolean {
        return this.expanded.has(this.getRowKey(file));
    }

    /** Only rows with recorded text have anything to reveal; the rest stay inert. */
    protected onRowClick(file: ConnectorRunFileModel): void {
        if (!this.hasFileMessage(file)) {
            return;
        }
        const key = this.getRowKey(file);
        if (this.expanded.has(key)) {
            this.expanded.delete(key);
        } else {
            this.expanded.add(key);
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.utcOffset);
    }
}

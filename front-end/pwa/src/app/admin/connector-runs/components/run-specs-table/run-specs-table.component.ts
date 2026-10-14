import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ConnectorRunSpecModel } from '../../models/connector-run.model';
import { RunSeverity, specAdvice, specSeverity } from '../../connector-run-thresholds';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

/**
 * The per-specification breakdown of one run — where a slow connector is
 * attributed to the specification responsible for it.
 */
@Component({
    selector: 'app-run-specs-table',
    templateUrl: './run-specs-table.component.html',
    styleUrls: ['./run-specs-table.component.scss']
})
export class RunSpecsTableComponent implements OnChanges {
    @Input() specs: ConnectorRunSpecModel[] = [];
    /** Import runs scan a remote listing; export runs generate files instead. */
    @Input() isImport: boolean = true;

    /**
     * Flagged rows whose advice is currently shown, keyed by binding id — a
     * row's identity within a run. A Set so several can be open at once.
     */
    private expanded = new Set<number>();

    /**
     * Which column the table is sorted by, in the same shape the rest of the app
     * uses (`appSortableHeader` + onSort/applySort, as in
     * ViewConnectorSpecificationsComponent).
     *
     * Defaults to the binding order rather than to cost, because that order is
     * meaningful: it is the order the connector processed its bindings in, and
     * opening on it is what shows the sysadmin their arrangement was respected.
     * Sorting by Scan is one click away.
     */
    protected sortColumn: string = 'sortOrder';
    protected sortDirection: 'asc' | 'desc' = 'asc';

    constructor(private cachedMetadata: CachedMetadataService) { }

    /** Collapse everything when a different run's specs arrive. */
    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['specs']) {
            this.applySort();
            this.expanded.clear();
        }
    }

    /**
     * Every column, import-only ones included — for the full-width rows. Counts
     * the caret and the row number, so it moves whenever a column is added at
     * either end.
     */
    protected get columnCount(): number {
        return this.isImport ? 15 : 10;
    }

    /**
     * Sort in place, client-side. The spec list is bounded by a connector's
     * bindings, so there is nothing to page and no need to re-query — unlike the
     * files table, whose filters are server-side because it can hold hundreds of
     * thousands of rows.
     */
    protected onSort(column: string): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            // Costs read most usefully worst-first, names most usefully A-Z.
            this.sortDirection = column === 'target' ? 'asc' : 'desc';
        }
        this.applySort();
    }

    private applySort(): void {
        if (!this.sortColumn) {
            return;
        }
        const dir: number = this.sortDirection === 'asc' ? 1 : -1;
        this.specs.sort((a, b) => {
            // Two columns are computed rather than stored, so they cannot be
            // read off the row: `target` is the pattern for an import and the
            // specification name for an export, and `queued` is derived the same
            // way the cell is.
            if (this.sortColumn === 'target') {
                return this.getTarget(a).localeCompare(this.getTarget(b)) * dir;
            }
            if (this.sortColumn === 'queued') {
                return (this.getQueuedCount(a) - this.getQueuedCount(b)) * dir;
            }
            const aVal = (a as any)[this.sortColumn];
            const bVal = (b as any)[this.sortColumn];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * dir;
            }
            return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
        });
    }

    /**
     * Files this specification matched but has not settled yet. Derived the
     * same way the runs list derives a run's queued count: whatever is left of
     * the matched total once every settled outcome is taken off it.
     */
    protected getQueuedCount(spec: ConnectorRunSpecModel): number {
        return Math.max(0, spec.matchedCount - spec.succeededCount - spec.failedCount
            - spec.skippedCount - spec.emptyCount);
    }

    /**
     * The station's name, or null when it is not in the local cache — a
     * station deleted since the run, or metadata not loaded yet. Looked up
     * leniently rather than through `getStation`, which throws: a run's record
     * outlives its configuration, and the id alone is still worth showing.
     * The `stationsMetadata` getter itself throws until the cache has loaded,
     * hence the try.
     */
    protected getStationName(stationId: string): string | null {
        try {
            return this.cachedMetadata.stationsMetadata.find(station => station.id === stationId)?.name ?? null;
        } catch {
            return null;
        }
    }

    protected getTarget(spec: ConnectorRunSpecModel): string {
        return spec.filePattern || `Specification #${spec.specificationId}`;
    }

    protected getRowClass(spec: ConnectorRunSpecModel): string {
        switch (specSeverity(spec)) {
            case 'red': return 'table-danger';
            case 'amber': return 'table-warning';
            default: return '';
        }
    }

    protected getSeverity(spec: ConnectorRunSpecModel): RunSeverity {
        return specSeverity(spec);
    }

    protected getAdvice(spec: ConnectorRunSpecModel): string | null {
        return specAdvice(spec);
    }

    protected hasAdvice(spec: ConnectorRunSpecModel): boolean {
        return specAdvice(spec) !== null;
    }

    protected isExpanded(spec: ConnectorRunSpecModel): boolean {
        return this.expanded.has(spec.bindingId);
    }

    /** Only flagged rows have anything to reveal, so other rows stay inert. */
    protected onRowClick(spec: ConnectorRunSpecModel): void {
        if (!this.hasAdvice(spec)) {
            return;
        }
        if (this.expanded.has(spec.bindingId)) {
            this.expanded.delete(spec.bindingId);
        } else {
            this.expanded.add(spec.bindingId);
        }
    }

    protected formatCount(value: number): string {
        return value.toLocaleString();
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
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { ConnectorRunFilesPageModel, ConnectorRunSpecModel, ViewConnectorRunModel } from '../models/connector-run.model';
import { ConnectorRunQueryModel } from '../models/connector-run-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

export interface ConnectorRunStats {
    /** Every attempt, including those that never reached the server. */
    totalRuns: number;
    /** Files that failed inside runs that were otherwise fine. */
    filesFailed: number;
    successfulRuns: number;
    /** Runs that could not complete — how you see "not connected since Tuesday". */
    failedRuns: number;
    lastRun: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ConnectorRunService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/connector-runs`;
    }

    public find(query: ConnectorRunQueryModel): Observable<ViewConnectorRunModel[]> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<ViewConnectorRunModel[]>(this.endPointUrl, { params });
    }

    public findOne(id: number): Observable<ViewConnectorRunModel> {
        return this.http.get<ViewConnectorRunModel>(`${this.endPointUrl}/${id}`);
    }

    /**
     * Download URL for the files a failed import kept. Opened directly rather
     * than fetched, so the browser handles the attachment. Only valid while the
     * row still has a retained operation directory.
     */
    public getRunFileDownloadUrl(runId: number, bindingId: number, remotePath: string): string {
        // The remote path goes in the query string, not a path segment: it
        // contains slashes and would otherwise be read as more segments.
        const params = new URLSearchParams({ bindingId: String(bindingId), remotePath });
        return `${this.endPointUrl}/${runId}/files/download?${params.toString()}`;
    }

    /** Per-file detail for one run (paginated). */
    /**
     * One page of a run's file ledger. Every filter is ANDed server-side, so
     * `search` and the dates narrow whatever `status` selected rather than
     * replacing it.
     */
    public findRunFiles(
        runId: number,
        status?: string,
        page?: number,
        pageSize?: number,
        search?: string,
        fromDate?: string,
        toDate?: string,
    ): Observable<ConnectorRunFilesPageModel> {
        const params = StringUtils.getQueryParams({ status, page, pageSize, search, fromDate, toDate });
        return this.http.get<ConnectorRunFilesPageModel>(`${this.endPointUrl}/${runId}/files`, { params });
    }

    /** Per-specification breakdown for one run — which spec cost what. */
    public findRunSpecs(runId: number): Observable<ConnectorRunSpecModel[]> {
        return this.http.get<ConnectorRunSpecModel[]>(`${this.endPointUrl}/${runId}/specs`);
    }

    public count(query: ConnectorRunQueryModel): Observable<number> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<number>(`${this.endPointUrl}/count`, { params });
    }

    public getStats(connectorId: number, startDate?: string, endDate?: string): Observable<ConnectorRunStats> {
        const params = StringUtils.getQueryParams({ connectorId, startDate, endDate });
        return this.http.get<ConnectorRunStats>(`${this.endPointUrl}/stats`, { params });
    }

    /**
     * Queue a run now. The API coalesces, so asking while one is already going
     * returns that run rather than starting a second.
     */
    public trigger(connectorId: number): Observable<ViewConnectorRunModel> {
        return this.http.post<ViewConnectorRunModel>(`${this.endPointUrl}/connector/${connectorId}/trigger`, {});
    }

    /**
     * Stop a run. A running one stops at its next batch boundary. Whatever it
     * had not yet ingested stays queued for the next run.
     */
    public cancel(id: number): Observable<ViewConnectorRunModel> {
        return this.http.patch<ViewConnectorRunModel>(`${this.endPointUrl}/${id}/cancel`, {});
    }

    /** Put a failed run back in the queue; it resumes rather than re-listing. */
    public retry(id: number): Observable<ViewConnectorRunModel> {
        return this.http.patch<ViewConnectorRunModel>(`${this.endPointUrl}/${id}/retry`, {});
    }

    public delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${id}`);
    }

    /**
     * Delete every run matching a filter — the same filter `find` and `count`
     * take, so the set deleted is exactly the set being shown. Any page/pageSize
     * is ignored server-side: this deletes the whole matching set.
     *
     * Cascades to the run specs and run files, including the import
     * de-duplication records, so the caller must warn the user first.
     * `skippedActive` counts runs left alone because they were still queued or
     * running — those have to be cancelled before they can be deleted.
     */
    public deleteAll(query: ConnectorRunQueryModel): Observable<{ deleted: number; skippedActive: number }> {
        const params = StringUtils.getQueryParams(query);
        return this.http.delete<{ deleted: number; skippedActive: number }>(this.endPointUrl, { params });
    }
}

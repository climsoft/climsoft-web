import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewConnectorExecutionLogModel } from '../models/connector-execution-log.model';
import { ConnectorLogQueryModel } from '../models/connector-log-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

export interface ConnectorExecutionStats {
    totalExecutions: number;
    totalErrors: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecution: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ConnectorExecutionLogService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/connector-execution-logs`;
    }

    public find(query: ConnectorLogQueryModel): Observable<ViewConnectorExecutionLogModel[]> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<ViewConnectorExecutionLogModel[]>(this.endPointUrl, { params });
    }

    public findOne(id: number): Observable<ViewConnectorExecutionLogModel> {
        return this.http.get<ViewConnectorExecutionLogModel>(`${this.endPointUrl}/${id}`);
    }

    public count(query: ConnectorLogQueryModel): Observable<number> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<number>(`${this.endPointUrl}/count`, { params });
    }

    public getStats(connectorId: number, startDate?: string, endDate?: string): Observable<ConnectorExecutionStats> {
        const params = StringUtils.getQueryParams({ connectorId, startDate, endDate });
        return this.http.get<ConnectorExecutionStats>(`${this.endPointUrl}/stats`, { params });
    }

    public delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${id}`);
    }
}

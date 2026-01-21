import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewJobQueueModel } from '../models/view-job-queue.model';
import { JobQueueQueryModel } from '../models/job-queue-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Injectable({
    providedIn: 'root'
})
export class JobQueueService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/job-queue`;
    }

    public find(query: JobQueueQueryModel): Observable<ViewJobQueueModel[]> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<ViewJobQueueModel[]>(this.endPointUrl, { params });
    }

    public findOne(id: number): Observable<ViewJobQueueModel> {
        return this.http.get<ViewJobQueueModel>(`${this.endPointUrl}/${id}`);
    }

    public count(query: JobQueueQueryModel): Observable<number> {
        const params = StringUtils.getQueryParams(query);
        return this.http.get<number>(`${this.endPointUrl}/count`, { params });
    }

    public cancel(id: number): Observable<ViewJobQueueModel> {
        return this.http.patch<ViewJobQueueModel>(`${this.endPointUrl}/${id}/cancel`, {});
    }

    public retry(id: number): Observable<ViewJobQueueModel> {
        return this.http.patch<ViewJobQueueModel>(`${this.endPointUrl}/${id}/retry`, {});
    }
}

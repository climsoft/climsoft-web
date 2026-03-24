import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import {
    BulkDeleteCheckRequest,
    BulkDeleteCheckResponse,
    BulkDeleteExecuteRequest,
    BulkDeleteExecuteResponse,
} from '../models/bulk-delete.model';

@Injectable({ providedIn: 'root' })
export class BulkDeleteService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/bulk-delete`;
    }

    check(request: BulkDeleteCheckRequest): Observable<BulkDeleteCheckResponse> {
        return this.http.post<BulkDeleteCheckResponse>(`${this.endPointUrl}/check`, request);
    }

    execute(request: BulkDeleteExecuteRequest): Observable<BulkDeleteExecuteResponse> {
        return this.http.post<BulkDeleteExecuteResponse>(`${this.endPointUrl}/execute`, request);
    }

    destroySession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${sessionId}`);
    }
}

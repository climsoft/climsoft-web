import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import {
    BulkRestoreCheckRequest,
    BulkRestoreCheckResponse,
    BulkRestoreExecuteRequest,
    BulkRestoreExecuteResponse,
} from '../models/bulk-restore.model';

@Injectable({ providedIn: 'root' })
export class BulkRestoreService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/bulk-restore`;
    }

    check(request: BulkRestoreCheckRequest): Observable<BulkRestoreCheckResponse> {
        return this.http.post<BulkRestoreCheckResponse>(`${this.endPointUrl}/check`, request);
    }

    execute(request: BulkRestoreExecuteRequest): Observable<BulkRestoreExecuteResponse> {
        return this.http.post<BulkRestoreExecuteResponse>(`${this.endPointUrl}/execute`, request);
    }

    getPreviewDownloadUrl(sessionId: string): string {
        return `${this.endPointUrl}/preview-download/${sessionId}`;
    }

    destroySession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${sessionId}`);
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import {
    BulkPkUpdateCheckRequest,
    BulkPkUpdateCheckResponse,
    BulkPkUpdateExecuteRequest,
    BulkPkUpdateExecuteResponse,
} from '../models/bulk-pk-update.model';

@Injectable({ providedIn: 'root' })
export class BulkPkUpdateService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/bulk-pk-update`;
    }

    check(request: BulkPkUpdateCheckRequest): Observable<BulkPkUpdateCheckResponse> {
        return this.http.post<BulkPkUpdateCheckResponse>(`${this.endPointUrl}/check`, request);
    }

    execute(request: BulkPkUpdateExecuteRequest): Observable<BulkPkUpdateExecuteResponse> {
        return this.http.post<BulkPkUpdateExecuteResponse>(`${this.endPointUrl}/execute`, request);
    }

    getConflictDownloadUrl(sessionId: string): string {
        return `${this.endPointUrl}/conflict-download/${sessionId}`;
    }

    destroySession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${sessionId}`);
    }
}

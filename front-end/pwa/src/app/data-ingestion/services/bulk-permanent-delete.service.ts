import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import {
    BulkPermanentDeleteCheckRequest,
    BulkPermanentDeleteCheckResponse,
    BulkPermanentDeleteExecuteRequest,
    BulkPermanentDeleteExecuteResponse,
} from '../models/bulk-permanent-delete.model';

@Injectable({ providedIn: 'root' })
export class BulkPermanentDeleteService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/bulk-permanent-delete`;
    }

    check(request: BulkPermanentDeleteCheckRequest): Observable<BulkPermanentDeleteCheckResponse> {
        return this.http.post<BulkPermanentDeleteCheckResponse>(`${this.endPointUrl}/check`, request);
    }

    execute(request: BulkPermanentDeleteExecuteRequest): Observable<BulkPermanentDeleteExecuteResponse> {
        return this.http.post<BulkPermanentDeleteExecuteResponse>(`${this.endPointUrl}/execute`, request);
    }

    getPreviewDownloadUrl(sessionId: string): string {
        return `${this.endPointUrl}/preview-download/${sessionId}`;
    }

    destroySession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${sessionId}`);
    }
}

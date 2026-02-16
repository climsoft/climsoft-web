import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { RawPreviewResponse, StepPreviewResponse } from '../../models/import-preview.model';
import { CreateSourceSpecificationModel } from '../../models/create-source-specification.model';

@Injectable({ providedIn: 'root' })
export class ImportPreviewHttpService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/import-preview`;
    }

    public upload(file: File, rowsToSkip: number, delimiter?: string): Observable<RawPreviewResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('rowsToSkip', rowsToSkip.toString());
        if (delimiter) {
            formData.append('delimiter', delimiter);
        }
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/upload`, formData);
    }

    public updateBaseParams(sessionId: string, rowsToSkip: number, delimiter?: string): Observable<RawPreviewResponse> {
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/base-params/${sessionId}`, {
            rowsToSkip,
            delimiter,
        });
    }

    public previewStep(sessionId: string, sourceDefinition: CreateSourceSpecificationModel, stationId?: string): Observable<StepPreviewResponse> {
        return this.http.post<StepPreviewResponse>(`${this.endPointUrl}/process/${sessionId}`, {
            sourceDefinition,
            stationId,
        });
    }

    public deleteSession(sessionId: string): Observable<any> {
        return this.http.delete(`${this.endPointUrl}/${sessionId}`);
    }
}

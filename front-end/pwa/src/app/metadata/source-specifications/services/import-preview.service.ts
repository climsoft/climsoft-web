import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { BaseParamsDto, RawPreviewResponse, TransformedPreviewResponse } from '../models/import-preview.model';
import { CreateSourceSpecificationModel } from '../models/create-source-specification.model';

@Injectable({ providedIn: 'root' })
export class ImportPreviewHttpService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/import-preview`;
    }

    public upload(file: File, model: BaseParamsDto): Observable<RawPreviewResponse> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        for (const [key, value] of Object.entries(model)) {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        }
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/upload`, formData);
    }

    public initFromFile(fileName: string, model: BaseParamsDto): Observable<RawPreviewResponse> {
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/init-from-file/${fileName}`, model);
    }

    public updateBaseParams(sessionId: string, model: BaseParamsDto): Observable<RawPreviewResponse> {
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/base-params/${sessionId}`, model);
    }

    public previewStep(sessionId: string, sourceDefinition: CreateSourceSpecificationModel, stationId?: string): Observable<TransformedPreviewResponse> {
        return this.http.post<TransformedPreviewResponse>(`${this.endPointUrl}/process-for-sample-import/${sessionId}`, {
            sourceDefinition,
            stationId,
        });
    }

    public previewForImport(sessionId: string, sourceId: number, stationId?: string | null): Observable<TransformedPreviewResponse> {
        return this.http.post<TransformedPreviewResponse>(`${this.endPointUrl}/process-for-import/${sessionId}`, {
            sourceId,
            stationId,
        });
    }

    public confirmImport(sessionId: string, sourceId: number, stationId?: string | null): Observable<any> {
        return this.http.post(`${this.endPointUrl}/confirm-import/${sessionId}`, {
            sourceId,
            stationId,
        });
    }

    public deleteSession(sessionId: string): Observable<any> {
        return this.http.delete(`${this.endPointUrl}/${sessionId}`);
    }
}

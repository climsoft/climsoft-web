import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import {
    MetadataRawPreviewResponse,
    MetadataStepPreviewResponse,
    StationTransformModel,
    ElementTransformModel,
} from '../models/metadata-import-preview.model';

@Injectable({ providedIn: 'root' })
export class MetadataImportPreviewHttpService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/metadata-import-preview`;
    }

    public upload(file: File, rowsToSkip: number, delimiter?: string): Observable<MetadataRawPreviewResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('rowsToSkip', rowsToSkip.toString());
        if (delimiter) {
            formData.append('delimiter', delimiter);
        }
        return this.http.post<MetadataRawPreviewResponse>(`${this.endPointUrl}/upload`, formData);
    }

    public updateBaseParams(sessionId: string, rowsToSkip: number, delimiter?: string): Observable<MetadataRawPreviewResponse> {
        return this.http.post<MetadataRawPreviewResponse>(`${this.endPointUrl}/base-params/${sessionId}`, {
            rowsToSkip,
            delimiter,
        });
    }

    public previewStations(sessionId: string, transform: StationTransformModel): Observable<MetadataStepPreviewResponse> {
        return this.http.post<MetadataStepPreviewResponse>(`${this.endPointUrl}/preview-stations/${sessionId}`, transform);
    }

    public confirmStationImport(sessionId: string, transform: StationTransformModel): Observable<any> {
        return this.http.post(`${this.endPointUrl}/confirm-station-import/${sessionId}`, transform);
    }

    public previewElements(sessionId: string, transform: ElementTransformModel): Observable<MetadataStepPreviewResponse> {
        return this.http.post<MetadataStepPreviewResponse>(`${this.endPointUrl}/preview-elements/${sessionId}`, transform);
    }

    public confirmElementImport(sessionId: string, transform: ElementTransformModel): Observable<any> {
        return this.http.post(`${this.endPointUrl}/confirm-element-import/${sessionId}`, transform);
    }

    public deleteSession(sessionId: string): Observable<any> {
        return this.http.delete(`${this.endPointUrl}/${sessionId}`);
    }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { RawPreviewResponse, TransformedPreviewResponse } from '../source-specifications/models/import-preview.model';
import { ElementColumnMappingModel, StationColumnMappingModel } from '../models/metadata-import-preview.model';

@Injectable({ providedIn: 'root' })
export class MetadataImportPreviewService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/metadata-import-preview`;
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

    public previewStations(sessionId: string, transform: StationColumnMappingModel): Observable<TransformedPreviewResponse> {
        return this.http.post<TransformedPreviewResponse>(`${this.endPointUrl}/preview-stations/${sessionId}`, transform);
    }

    public confirmStationImport(sessionId: string, transform: StationColumnMappingModel): Observable<any> {
        return this.http.post(`${this.endPointUrl}/confirm-station-import/${sessionId}`, transform);
    }

    public previewElements(sessionId: string, transform: ElementColumnMappingModel): Observable<RawPreviewResponse> {
        return this.http.post<RawPreviewResponse>(`${this.endPointUrl}/preview-elements/${sessionId}`, transform);
    }

    public confirmElementImport(sessionId: string, transform: ElementColumnMappingModel): Observable<any> {
        return this.http.post(`${this.endPointUrl}/confirm-element-import/${sessionId}`, transform);
    }

    public deleteSession(sessionId: string): Observable<any> {
        return this.http.delete(`${this.endPointUrl}/${sessionId}`);
    }
}

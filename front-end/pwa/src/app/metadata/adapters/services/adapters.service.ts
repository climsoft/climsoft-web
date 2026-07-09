import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewAdapterSpecificationModel } from '../models/view-adapter-specification.model';
import { CreateAdapterSpecificationModel } from '../models/create-adapter-specification.model';
import { UpdateAdapterSpecificationModel } from '../models/update-adapter-specification.model';
import { AdapterTestRunResponseModel } from '../models/adapter-test-run-response.model';
import { AdapterUploadPreviewResponseModel } from '../models/adapter-upload-preview-response.model';
import { AdapterLanguageEnum } from '../models/adapter-language.enum';
import { AdapterTestRunPreviewModel } from '../models/adapter-test-run-preview.model';

@Injectable({
    providedIn: 'root',
})
export class AdaptersService {
    private readonly endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/adapters`;
    }

    public findAll(): Observable<ViewAdapterSpecificationModel[]> {
        return this.http.get<ViewAdapterSpecificationModel[]>(`${this.endPointUrl}`);
    }

    public findOne(id: number): Observable<ViewAdapterSpecificationModel> {
        return this.http.get<ViewAdapterSpecificationModel>(`${this.endPointUrl}/${id}`);
    }

    /**
     * Returns the file tree and manifest validation for an existing adapter's
     * script directory. Called when the dialog opens in edit mode.
     */
    public getFileTree(id: number): Observable<AdapterUploadPreviewResponseModel> {
        return this.http.get<AdapterUploadPreviewResponseModel>(`${this.endPointUrl}/${id}/file-tree`);
    }

    /**
     * Uploads and extracts a zip, returning the file tree and manifest
     * validation. The returned `scriptDirName` is passed to create/update.
     */
    public uploadPreview(zipFile: File, language: AdapterLanguageEnum): Observable<AdapterUploadPreviewResponseModel> {
        const form = new FormData();
        form.append('file', zipFile, zipFile.name);
        form.append('language', language);
        return this.http.post<AdapterUploadPreviewResponseModel>(
            `${this.endPointUrl}/upload-preview`,
            form,
        );
    }

    /**
     * Creates a new adapter. The zip has already been uploaded via
     * `uploadPreview()` — the body references the extracted directory
     * by its UUID (`scriptDirName`).
     */
    public create(createModel: CreateAdapterSpecificationModel): Observable<ViewAdapterSpecificationModel> {
        return this.http.post<ViewAdapterSpecificationModel>(this.endPointUrl, createModel);
    }

    /**
     * Updates an existing adapter. `scriptDirName` is optional — only
     * sent when a new zip was uploaded via `uploadPreview()`.
     */
    public update(id: number, updateModel: UpdateAdapterSpecificationModel): Observable<ViewAdapterSpecificationModel> {
        return this.http.patch<ViewAdapterSpecificationModel>(`${this.endPointUrl}/${id}`, updateModel);
    }

    public delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.endPointUrl}/${id}`);
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`);
    }

    public getLanguageTemplateDownloadUrl(language: string): string {
        return `${this.endPointUrl}/templates/${language}`;
    }

    public getAdapterDownloadUrl(id: number): string {
        return `${this.endPointUrl}/${id}/download`;
    }

    public getTestRunOutputDownloadUrl(operationId: string): string {
        return `${this.endPointUrl}/test-run-preview/output/${operationId}`;
    }

    /**
     * Runs a test against an unsaved adapter using the scriptDirName from
     * a prior `uploadPreview()` call. Lets sysadmins verify scripts before saving.
     */
    public testRunPreview(sampleFile: File , model: AdapterTestRunPreviewModel): Observable<AdapterTestRunResponseModel> {
        const formData = new FormData();
        formData.append('file', sampleFile, sampleFile.name);
        for (const [key, value] of Object.entries(model)) {
            formData.append(key, String(value));
        }
        return this.http.post<AdapterTestRunResponseModel>(
            `${this.endPointUrl}/test-run-preview`,
            formData,
        );
    }
}

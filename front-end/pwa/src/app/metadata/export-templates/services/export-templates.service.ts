import { catchError, Observable, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { AppConfigService } from "src/app/app-config.service";
import { ViewExportTemplateModel } from "../models/view-export-template.model";
import { CreateExportTemplateModel } from "../models/create-export-template.model";

@Injectable({
    providedIn: 'root'
})
export class ExportTemplatesService {
    private endPointUrl: string; 
    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/export-templates`;
    }

    public findAll(): Observable<ViewExportTemplateModel[]> {
        return this.http.get<ViewExportTemplateModel[]>(`${this.endPointUrl}`).pipe(
            catchError(this.handleError)
        );
    }

    public findOne(id: number): Observable<ViewExportTemplateModel> {
        return this.http.get<ViewExportTemplateModel>(`${this.endPointUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    public put(createDto: CreateExportTemplateModel): Observable<ViewExportTemplateModel> {
        return this.http.post<ViewExportTemplateModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateExportTemplateModel): Observable<ViewExportTemplateModel> {
        return this.http.patch<ViewExportTemplateModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(
                catchError(this.handleError)
            );
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    private handleError(error: HttpErrorResponse) {
        if (error.status === 0) {
            // A client-side or network error occurred. Handle it accordingly.
            console.error('An error occurred:', error.error);
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong.
            console.error(`Backend returned code ${error.status}, body was: `, error.error);
        }
        // Return an observable with a user-facing error message.
        return throwError(() => new Error('Something bad happened. please try again later.'));
    }


}
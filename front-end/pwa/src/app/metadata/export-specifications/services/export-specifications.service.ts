import { catchError, Observable, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { AppConfigService } from "src/app/app-config.service";
import { ViewExportSpecificationModel } from "../models/view-export-specification.model";
import { CreateExportSpecificationModel } from "../models/create-export-specification.model";

@Injectable({
    providedIn: 'root'
})
export class ExportSpecificationsService {
    private endPointUrl: string;
    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/export-specifications`;
    }

    public findAll(): Observable<ViewExportSpecificationModel[]> {
        return this.http.get<ViewExportSpecificationModel[]>(`${this.endPointUrl}`).pipe(
            catchError(this.handleError)
        );
    }

    public findOne(id: number): Observable<ViewExportSpecificationModel> {
        return this.http.get<ViewExportSpecificationModel>(`${this.endPointUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    public findSynopBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/synop-bufr-elements`).pipe(
            catchError(this.handleError)
        );
    }

    public findDayCliBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/daycli-bufr-elements`).pipe(
            catchError(this.handleError)
        );
    }

    public findClimatBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/climat-bufr-elements`).pipe(
            catchError(this.handleError)
        );
    }

       public findTempBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/temp-bufr-elements`).pipe(
            catchError(this.handleError)
        );
    }

    public add(createDto: CreateExportSpecificationModel): Observable<ViewExportSpecificationModel> {
        return this.http.post<ViewExportSpecificationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateExportSpecificationModel): Observable<ViewExportSpecificationModel> {
        return this.http.patch<ViewExportSpecificationModel>(`${this.endPointUrl}/${id}`, updateDto)
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
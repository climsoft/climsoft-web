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
        return this.http.get<ViewExportSpecificationModel[]>(`${this.endPointUrl}`);
    }

    public findOne(id: number): Observable<ViewExportSpecificationModel> {
        return this.http.get<ViewExportSpecificationModel>(`${this.endPointUrl}/${id}`);
    }

    public findSynopBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/synop-bufr-elements`);
    }

    public findDayCliBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/daycli-bufr-elements`);
    }

    public findClimatBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/climat-bufr-elements`);
    }

    public findTempBufrElements(): Observable<string[]> {
        return this.http.get<string[]>(`${this.endPointUrl}/temp-bufr-elements`);
    }

    public add(createDto: CreateExportSpecificationModel): Observable<ViewExportSpecificationModel> {
        return this.http.post<ViewExportSpecificationModel>(`${this.endPointUrl}`, createDto);
    }

    public update(id: number, updateDto: CreateExportSpecificationModel): Observable<ViewExportSpecificationModel> {
        return this.http.patch<ViewExportSpecificationModel>(`${this.endPointUrl}/${id}`, updateDto);
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`);
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`);
    }
}
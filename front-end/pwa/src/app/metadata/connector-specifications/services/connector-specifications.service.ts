import { Observable } from "rxjs";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AppConfigService } from "src/app/app-config.service";
import { CreateConnectorSpecificationModel } from "../models/create-connector-specification.model";
import { ViewConnectorSpecificationModel } from "../models/view-connector-specification.model";

@Injectable({
    providedIn: 'root'
})
export class ConnectorSpecificationsService {
    private endPointUrl: string;

    constructor(
        private appConfigService: AppConfigService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/connector-specifications`;
    }

    public findAll(): Observable<ViewConnectorSpecificationModel[]> {
        return this.http.get<ViewConnectorSpecificationModel[]>(`${this.endPointUrl}`);
    }

    public findOne(id: number): Observable<ViewConnectorSpecificationModel> {
        return this.http.get<ViewConnectorSpecificationModel>(`${this.endPointUrl}/${id}`);
    }

    public put(createDto: CreateConnectorSpecificationModel): Observable<ViewConnectorSpecificationModel> {
        return this.http.post<ViewConnectorSpecificationModel>(`${this.endPointUrl}`, createDto);
    }

    public update(id: number, updateDto: CreateConnectorSpecificationModel): Observable<ViewConnectorSpecificationModel> {
        return this.http.patch<ViewConnectorSpecificationModel>(`${this.endPointUrl}/${id}`, updateDto);
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`);
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`);
    }
}